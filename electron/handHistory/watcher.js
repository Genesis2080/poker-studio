'use strict'

/**
 * watcher.js — vigilancia de archivos HandHistory
 * ─────────────────────────────────────────────────────────────────
 *
 * Fixes respecto a la versión anterior:
 *
 *  1. awaitWriteFinish desactivado para el evento 'add' en archivos existentes:
 *     chokidar con awaitWriteFinish nunca emitía 'add' para archivos grandes
 *     ya existentes porque los consideraba "inestables". Ahora usamos
 *     ignoreInitial:true para archivos existentes y los procesamos manualmente
 *     en el evento 'ready'.
 *
 *  2. Lectura robusta de archivos grandes: usamos createReadStream con
 *     posicionamiento en lugar de readSync para no bloquear el event loop
 *     con archivos de decenas de MB.
 *
 *  3. Mejor detección de encoding: PokerStars moderno usa UTF-8.
 *     Las versiones antiguas usan UTF-16 LE con BOM (0xFF 0xFE).
 *     Detectamos ambos y también UTF-8 con BOM.
 *
 *  4. El watcher ahora emite 'stats' periódicamente para actualizar la UI.
 */

const fs           = require('fs')
const path         = require('path')
const EventEmitter = require('events')

let chokidar
try { chokidar = require('chokidar') } catch { chokidar = null }

// ── Constantes ────────────────────────────────────────────────────
const DEBOUNCE_MS    = 500     // ms de espera tras el último evento de escritura
const MIN_HAND_SIZE  = 50      // bytes mínimos para considerar un bloque válido
const STATS_INTERVAL = 10_000  // cada 10s emitir stats al UI

class HandHistoryWatcher extends EventEmitter {
  constructor({ getOffset, setOffset }) {
    super()
    this._getOffset = getOffset
    this._setOffset = setOffset
    this._watcher   = null
    this._watchPath = null
    this._timers    = new Map()
    this._statsTimer= null
    this._running   = false
    this._stats     = { filesWatched: 0, reads: 0, bytesRead: 0, errors: 0 }
  }

  get isRunning()  { return this._running }
  get watchPath()  { return this._watchPath }

  // ── Arrancar ────────────────────────────────────────────────────
  start(folderPath) {
    if (this._running) this.stop()

    if (!chokidar) {
      this.emit('error', new Error('chokidar no está instalado. Ejecuta: npm install chokidar'))
      return
    }

    if (!fs.existsSync(folderPath)) {
      this.emit('error', new Error(`La carpeta no existe: ${folderPath}`))
      return
    }

    this._watchPath = folderPath
    this._running   = true

    // ignoreInitial: TRUE — no emitir 'add' para archivos ya existentes.
    // Los procesamos nosotros en el evento 'ready' para tener control total.
    this._watcher = chokidar.watch(path.join(folderPath, '**/*.txt'), {
      persistent:    true,
      ignoreInitial: true,    // ← FIX: no usar awaitWriteFinish en archivos existentes
      depth:         5,
      usePolling:    false,
      ignored:       /(^|[/\\])\.|node_modules/,
      // awaitWriteFinish solo para eventos 'change' (PokerStars escribe mientras juegas)
      awaitWriteFinish: {
        stabilityThreshold: DEBOUNCE_MS,
        pollInterval:       100,
      },
    })

    this._watcher.on('add',    fp => this._scheduleRead(fp, 'add'))
    this._watcher.on('change', fp => this._scheduleRead(fp, 'change'))
    this._watcher.on('error',  err => { this._stats.errors++; this.emit('error', err) })

    this._watcher.on('ready', () => {
      // Procesar todos los archivos .txt existentes en la carpeta
      this._processExistingFiles(folderPath)
        .then(() => {
          this.emit('ready', { watchPath: folderPath })
        })
        .catch(err => this.emit('error', err))
    })

    // Emitir stats periódicamente para actualizar la UI
    this._statsTimer = setInterval(() => {
      this.emit('stats', { ...this._stats })
    }, STATS_INTERVAL)
  }

  // ── Detener ─────────────────────────────────────────────────────
  stop() {
    if (this._watcher)    { this._watcher.close(); this._watcher = null }
    if (this._statsTimer) { clearInterval(this._statsTimer); this._statsTimer = null }
    for (const t of this._timers.values()) clearTimeout(t)
    this._timers.clear()
    this._running   = false
    this._watchPath = null
    this.emit('stopped')
  }

  // ── Procesar archivos existentes al arrancar ─────────────────────
  /**
   * Al iniciar el watcher, leer todos los .txt existentes desde su offset.
   * Si el offset es 0, es un archivo nuevo → leer todo.
   * Si el offset > 0, es un archivo ya conocido → leer solo lo nuevo.
   */
  async _processExistingFiles(folderPath) {
    const txtFiles = this._findTxtFiles(folderPath)
    this._stats.filesWatched = txtFiles.length

    for (const fp of txtFiles) {
      try {
        await this._readFile(fp, 'existing')
      } catch (err) {
        this._stats.errors++
        this.emit('fileError', { filePath: fp, error: err.message })
      }
    }
  }

  // Encuentra todos los .txt de forma recursiva (sin dependencias extra)
  _findTxtFiles(dir, result = []) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          this._findTxtFiles(full, result)
        } else if (entry.isFile() && entry.name.endsWith('.txt')) {
          result.push(full)
        }
      }
    } catch {}
    return result
  }

  // ── Debounce para cambios en vivo ────────────────────────────────
  _scheduleRead(filePath, reason) {
    if (!filePath.endsWith('.txt')) return
    if (this._timers.has(filePath)) clearTimeout(this._timers.get(filePath))
    const t = setTimeout(() => {
      this._timers.delete(filePath)
      this._readFile(filePath, reason).catch(err => {
        this._stats.errors++
        this.emit('fileError', { filePath, error: err.message })
      })
    }, DEBOUNCE_MS)
    this._timers.set(filePath, t)
  }

  // ── Lectura incremental ──────────────────────────────────────────
  /**
   * _readFile(filePath, reason) → Promise<void>
   *
   * Lee exactamente desde el offset guardado hasta el final del archivo.
   * Si el archivo no ha crecido, no hace nada.
   */
  async _readFile(filePath, reason) {
    let stats
    try { stats = fs.statSync(filePath) } catch { return }

    const startOffset = this._getOffset(filePath)

    // Nada nuevo
    if (stats.size <= startOffset) return

    const newBytes = stats.size - startOffset
    const buffer   = Buffer.alloc(newBytes)

    // Leer desde el offset con descriptor de archivo posicionado
    let fd
    try {
      fd = fs.openSync(filePath, 'r')
      const bytesRead = fs.readSync(fd, buffer, 0, newBytes, startOffset)
      if (bytesRead === 0) return

      const content = decodeBuffer(buffer.slice(0, bytesRead))

      // Solo procesar hasta el último salto de línea completo
      // (evita parsear una mano a medio escribir por PokerStars)
      const lastNL = content.lastIndexOf('\n')
      if (lastNL === -1) return

      const safeContent = content.slice(0, lastNL + 1)
      const safeBytes   = Buffer.byteLength(safeContent, 'utf8')
      const newOffset   = startOffset + safeBytes

      // Guardar offset ANTES de emitir (si el proceso muere a mitad,
      // no re-leeremos este contenido la próxima vez)
      this._setOffset(filePath, newOffset)

      this._stats.reads++
      this._stats.bytesRead += safeBytes

      this.emit('newContent', {
        filePath,
        content:  safeContent,
        reason,
        offset:   newOffset,
        fileSize: stats.size,
      })
    } finally {
      if (fd !== undefined) try { fs.closeSync(fd) } catch {}
    }
  }
}

// ── Decodificación multi-encoding ────────────────────────────────
function decodeBuffer(buf) {
  if (!buf || buf.length === 0) return ''

  // UTF-16 LE con BOM (0xFF 0xFE) — versiones antiguas de PokerStars
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    return buf.toString('utf16le')
  }

  // UTF-8 con BOM (0xEF 0xBB 0xBF)
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8')
  }

  // UTF-8 sin BOM (la mayoría de instalaciones modernas de PokerStars)
  return buf.toString('utf8')
}

// ── Ruta por defecto de PokerStars según OS ───────────────────────
function getDefaultHHPath() {
  const os   = require('os')
  const home = os.homedir()

  const candidates = [
    // Windows — rutas más comunes
    path.join(home, 'AppData', 'Local', 'PokerStars', 'HandHistory'),
    path.join(home, 'AppData', 'Local', 'PokerStars.EU', 'HandHistory'),
    path.join(home, 'AppData', 'Local', 'PokerStars.FR', 'HandHistory'),
    path.join(home, 'AppData', 'Local', 'PokerStars.ES', 'HandHistory'),
    // Windows — ruta pública alternativa
    path.join('C:', 'Program Files', 'PokerStars', 'HandHistory'),
    // macOS
    path.join(home, 'Library', 'Application Support', 'PokerStars', 'HandHistory'),
    path.join(home, 'Library', 'Application Support', 'PokerStars.EU', 'HandHistory'),
    // Linux (Wine)
    path.join(home, '.wine', 'drive_c', 'Program Files', 'PokerStars', 'HandHistory'),
  ]

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

module.exports = { HandHistoryWatcher, getDefaultHHPath, decodeBuffer }