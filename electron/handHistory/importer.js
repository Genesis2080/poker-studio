'use strict'

/**
 * importer.js
 * ─────────────────────────────────────────────────────────────────
 * Orquestador del sistema de importación.
 *
 * Flujo completo:
 *
 *   chokidar detecta cambio en archivo
 *        ↓
 *   HandHistoryWatcher lee el contenido nuevo (incremental)
 *        ↓
 *   Importer → parser.splitHands() → bloques individuales
 *        ↓
 *   parser.parseHand() → objeto normalizado por mano
 *        ↓
 *   db.handExists() → filtrar duplicados
 *        ↓
 *   db.insertHands() → guardar en SQLite via sql.js (WebAssembly)
 *        ↓
 *   Emite 'handsImported' → main.js lo escucha y hace push al renderer vía IPC
 *
 * Nota sobre async:
 *   sql.js inicializa el módulo WASM de forma asíncrona.
 *   Por eso start() es async y espera a que la DB esté lista
 *   antes de arrancar el watcher. Una vez lista, todas las
 *   operaciones de DB son síncronas (igual que better-sqlite3).
 */

const path         = require('path')
const EventEmitter = require('events')

const { HandHistoryWatcher, getDefaultHHPath } = require('./watcher')
const { splitHands, parseHand, extractHandId } = require('./parser')
const {
  getDb, closeDb,
  getOffset, setOffset,
  handExists, insertHands,
  getUnsynced, markSynced,
  getStats, getAllFileOffsets,
} = require('./db')

// ── HandHistoryImporter ───────────────────────────────────────────
class HandHistoryImporter extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {string} opts.dbPath      Ruta al archivo SQLite
   * @param {string} [opts.hhFolder]  Carpeta HandHistory (usa default si no se especifica)
   */
  constructor({ dbPath, hhFolder }) {
    super()
    this._dbPath   = dbPath
    this._hhFolder = hhFolder || getDefaultHHPath()
    this._db       = null
    this._watcher  = null
    this._starting = false   // guard para evitar doble arranque concurrente

    this._sessionStats = {
      filesProcessed: 0,
      handsFound:     0,
      handsInserted:  0,
      errors:         0,
      startedAt:      null,
    }
  }

  // ── Propiedades ──────────────────────────────────────────────────
  get isRunning()   { return this._watcher?.isRunning ?? false }
  get watchFolder() { return this._hhFolder }
  get dbPath()      { return this._dbPath }

  // ── Arrancar ─────────────────────────────────────────────────────
  /**
   * start(hhFolder?) → Promise<void>
   *
   * Es async porque sql.js necesita cargar el módulo WASM antes de
   * poder operar. El watcher no arranca hasta que la DB está lista,
   * garantizando que no se pierden manos durante la inicialización.
   */
  async start(hhFolder) {
    if (this.isRunning || this._starting) {
      this.emit('warn', 'El importer ya está en ejecución o arrancando.')
      return
    }
    this._starting = true

    if (hhFolder) this._hhFolder = hhFolder

    if (!this._hhFolder) {
      this._starting = false
      this.emit('error', new Error(
        'No se encontró la carpeta HandHistory de PokerStars. ' +
        'Configúrala manualmente en Ajustes → Importar.'
      ))
      return
    }

    // ── Inicializar sql.js (async) ──────────────────────────────
    try {
      this._db = await getDb(this._dbPath)
    } catch (err) {
      this._starting = false
      this.emit('error', new Error(`Error al inicializar la base de datos: ${err.message}`))
      return
    }

    // Resetear stats de sesión
    this._sessionStats = {
      filesProcessed: 0,
      handsFound:     0,
      handsInserted:  0,
      errors:         0,
      startedAt:      Date.now(),
    }

    // ── Crear watcher ────────────────────────────────────────────
    // Los callbacks de offset son síncronos una vez la DB está lista
    this._watcher = new HandHistoryWatcher({
      getOffset: (filePath) => getOffset(this._db, filePath),
      setOffset: (filePath, offset) => setOffset(this._db, filePath, offset),
    })

    this._watcher.on('newContent', ({ filePath, content }) => {
      this._processContent(filePath, content)
    })

    this._watcher.on('ready', ({ watchPath }) => {
      this.emit('ready', {
        watchPath,
        dbStats:     getStats(this._db),
        fileOffsets: getAllFileOffsets(this._db),
      })
    })

    this._watcher.on('error', (err) => {
      this._sessionStats.errors++
      this.emit('error', err)
    })

    this._watcher.on('fileError', ({ filePath, error }) => {
      this._sessionStats.errors++
      this.emit('fileError', { filePath, error })
    })

    this._watcher.on('stopped', () => {
      this.emit('stopped', this._sessionStats)
    })

    this._watcher.start(this._hhFolder)
    this._starting = false
    this.emit('started', { hhFolder: this._hhFolder, dbPath: this._dbPath })
  }

  // ── Detener ──────────────────────────────────────────────────────
  stop() {
    if (this._watcher) {
      this._watcher.stop()
      this._watcher = null
    }
    closeDb()
    this._db       = null
    this._starting = false
  }

  // ── Cambiar carpeta en caliente ───────────────────────────────────
  async setFolder(newFolder) {
    const wasRunning = this.isRunning
    if (wasRunning) this.stop()
    this._hhFolder = newFolder
    if (wasRunning) await this.start()
  }

  // ── Procesar contenido nuevo ─────────────────────────────────────
  /**
   * _processContent(filePath, rawText)
   *
   * Divide el texto en manos, parsea, filtra duplicados e inserta.
   * Síncrono una vez la DB está inicializada.
   */
  _processContent(filePath, rawText) {
    this._sessionStats.filesProcessed++

    const blocks = splitHands(rawText)
    if (!blocks.length) return

    this._sessionStats.handsFound += blocks.length

    const toInsert = []

    for (const block of blocks) {
      try {
        const handId = extractHandId(block)
        if (!handId) continue

        // Deduplicación por PRIMARY KEY (O(1))
        if (handExists(this._db, handId)) continue

        const hand = parseHand(block)
        if (!hand) continue

        toInsert.push(hand)
      } catch (err) {
        this._sessionStats.errors++
        this.emit('parseError', { filePath, error: err.message })
      }
    }

    if (!toInsert.length) return

    // Insertar en transacción — insertHands persiste a disco automáticamente
    const inserted = insertHands(this._db, toInsert)
    this._sessionStats.handsInserted += inserted

    if (inserted > 0) {
      this.emit('handsImported', {
        hands:    toInsert.slice(0, inserted),
        count:    inserted,
        filePath,
        stats:    { ...this._sessionStats },
      })
    }
  }

  // ── Sincronización con data.json ─────────────────────────────────
  syncToApp(limit = 500) {
    if (!this._db) return []
    return getUnsynced(this._db, limit)
  }

  confirmSync(ids) {
    if (!this._db) return
    markSynced(this._db, ids)
  }

  // ── Estadísticas ─────────────────────────────────────────────────
  getStats() {
    return {
      session:     { ...this._sessionStats },
      db:          getStats(this._db),
      fileOffsets: getAllFileOffsets(this._db),
      isRunning:   this.isRunning,
      watchFolder: this._hhFolder,
    }
  }
}

module.exports = { HandHistoryImporter, getDefaultHHPath }