'use strict'

/**
 * watcher.js
 * ─────────────────────────────────────────────────────────────────
 * Vigilancia de la carpeta HandHistory de PokerStars con chokidar.
 *
 * Diseño:
 *  - Usa chokidar para detectar archivos .txt nuevos o modificados
 *  - Lee SOLO el contenido nuevo desde el último offset conocido
 *    (lectura incremental — nunca re-lee lo ya procesado)
 *  - Emite eventos 'hands' con los bloques de texto nuevos
 *  - Gestiona sus propios errores sin crashear el proceso principal
 *
 * Por qué lectura incremental:
 *  PokerStars añade manos al mismo archivo continuamente durante una sesión.
 *  Un archivo puede crecer de 0 a 50MB+ en pocas horas. Re-leer siempre
 *  desde el principio sería O(n²). Con offsets es O(1) por evento.
 *
 * Por qué chokidar y no fs.watch:
 *  - fs.watch tiene bugs en macOS (no detecta todos los cambios)
 *  - fs.watch no es consistente entre plataformas
 *  - chokidar unifica el comportamiento y añade debouncing
 */

const fs        = require('fs')
const path      = require('path')
const EventEmitter = require('events')

// chokidar se carga de forma lazy
let chokidar
try { chokidar = require('chokidar') } catch { chokidar = null }

// ── Constantes ────────────────────────────────────────────────────

// PokerStars escribe los archivos HH como texto UTF-8 o UTF-16 LE con BOM
// La mayoría son UTF-8 en versiones recientes
const ENCODING = 'utf8'

// Esperar este tiempo (ms) tras el último evento antes de procesar
// Evita procesar un archivo mientras PokerStars todavía está escribiendo
const DEBOUNCE_MS = 400

// Solo monitorear archivos .txt (los HH de PokerStars son siempre .txt)
const GLOB_PATTERN = '**/*.txt'

// ── HandHistoryWatcher ────────────────────────────────────────────
class HandHistoryWatcher extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {Function} opts.getOffset   (filePath) → number
   * @param {Function} opts.setOffset   (filePath, offset) → void
   */
  constructor({ getOffset, setOffset }) {
    super()
    this._getOffset = getOffset
    this._setOffset = setOffset
    this._watcher   = null
    this._watchPath = null
    this._timers    = new Map()   // debounce timers por archivo
    this._running   = false
  }

  // ── Arrancar ────────────────────────────────────────────────────
  /**
   * start(folderPath)
   * Comienza a monitorear la carpeta indicada.
   * Emite 'ready' cuando chokidar termina el escaneo inicial.
   * Emite 'error' si la carpeta no existe o chokidar no está instalado.
   */
  start(folderPath) {
    if (this._running) this.stop()

    if (!chokidar) {
      this.emit('error', new Error(
        'chokidar no está instalado. Ejecuta: npm install chokidar'
      ))
      return
    }

    if (!fs.existsSync(folderPath)) {
      this.emit('error', new Error(
        `La carpeta no existe: ${folderPath}`
      ))
      return
    }

    this._watchPath = folderPath
    this._running   = true

    // Opciones de chokidar
    const watchOpts = {
      // No emitir eventos para archivos que ya existían al arrancar
      // (los procesamos nosotros en el evento 'ready')
      ignoreInitial: false,

      // Persistir el watcher aunque la carpeta se vacíe temporalmente
      persistent: true,

      // Profundidad de subdirectorios (PokerStars guarda por sala/mes)
      depth: 4,

      // Intervalo de polling como fallback en sistemas NFS/VMs
      usePolling: false,

      // Ignorar archivos ocultos y carpetas del sistema
      ignored: /(^|[/\\])\.|(node_modules)/,

      // Tiempo que debe estar estable el tamaño antes de emitir 'add'
      awaitWriteFinish: {
        stabilityThreshold: DEBOUNCE_MS,
        pollInterval:       100,
      },
    }

    this._watcher = chokidar.watch(
      path.join(folderPath, GLOB_PATTERN),
      watchOpts
    )

    // Archivo nuevo detectado
    this._watcher.on('add', (filePath) => {
      this._scheduleRead(filePath, 'add')
    })

    // Archivo modificado (PokerStars añadió nuevas manos)
    this._watcher.on('change', (filePath) => {
      this._scheduleRead(filePath, 'change')
    })

    // Error del watcher (p.ej. permisos)
    this._watcher.on('error', (err) => {
      this.emit('error', err)
    })

    // Escaneo inicial completado
    this._watcher.on('ready', () => {
      this.emit('ready', { watchPath: folderPath })
    })
  }

  // ── Detener ─────────────────────────────────────────────────────
  stop() {
    if (this._watcher) {
      this._watcher.close()
      this._watcher = null
    }
    // Cancelar todos los timers pendientes
    for (const timer of this._timers.values()) clearTimeout(timer)
    this._timers.clear()
    this._running   = false
    this._watchPath = null
    this.emit('stopped')
  }

  get isRunning() { return this._running }
  get watchPath() { return this._watchPath }

  // ── Lectura incremental ─────────────────────────────────────────

  /**
   * _scheduleRead(filePath, reason)
   * Programa la lectura con debounce para no procesar un archivo
   * mientras PokerStars todavía está escribiendo en él.
   */
  _scheduleRead(filePath, reason) {
    // Solo archivos .txt
    if (!filePath.endsWith('.txt')) return

    // Cancelar timer previo para este archivo (debounce)
    if (this._timers.has(filePath)) {
      clearTimeout(this._timers.get(filePath))
    }

    const timer = setTimeout(() => {
      this._timers.delete(filePath)
      this._readIncremental(filePath, reason)
    }, DEBOUNCE_MS)

    this._timers.set(filePath, timer)
  }

  /**
   * _readIncremental(filePath, reason)
   * Lee SOLO el contenido nuevo desde el último offset conocido.
   *
   * Usa fs.open + fs.read (stream manual) para leer exactamente
   * desde el offset sin cargar el archivo completo en memoria.
   */
  _readIncremental(filePath, reason) {
    let fd
    try {
      const stats = fs.statSync(filePath)

      // Offset desde donde continuar leyendo
      const startOffset = this._getOffset(filePath)

      // Nada nuevo
      if (stats.size <= startOffset) return

      // Abrir el archivo solo para lectura
      fd = fs.openSync(filePath, 'r')

      const newBytes  = stats.size - startOffset
      const buffer    = Buffer.alloc(newBytes)

      // Leer exactamente desde startOffset hasta el final
      const bytesRead = fs.readSync(fd, buffer, 0, newBytes, startOffset)
      fs.closeSync(fd)
      fd = null

      if (bytesRead === 0) return

      // Decodificar — manejar BOM de UTF-16 LE si está presente
      let newContent = decodeContent(buffer.slice(0, bytesRead))

      // Asegurar que solo procesamos texto completo hasta el último salto de línea
      // (PokerStars puede haber dejado una mano incompleta a medio escribir)
      const lastNewline = newContent.lastIndexOf('\n')
      if (lastNewline === -1) return   // sin línea completa todavía

      // Solo procesar hasta el último salto de línea completo
      const safeContent   = newContent.slice(0, lastNewline + 1)
      const newOffset     = startOffset + Buffer.byteLength(safeContent, ENCODING)

      // Guardar el nuevo offset ANTES de emitir (por si el proceso se interrumpe)
      this._setOffset(filePath, newOffset)

      // Emitir el texto nuevo para que el importer lo parsee
      this.emit('newContent', {
        filePath,
        content: safeContent,
        reason,
        offset:  newOffset,
        fileSize: stats.size,
      })

    } catch (err) {
      if (fd !== undefined && fd !== null) {
        try { fs.closeSync(fd) } catch {}
      }
      // No crashear — solo registrar y continuar
      this.emit('fileError', { filePath, error: err.message })
    }
  }
}

// ── Decodificación multi-encoding ────────────────────────────────

/**
 * decodeContent(buffer) → string
 * PokerStars puede guardar HH en UTF-8 o UTF-16 LE (con BOM 0xFF 0xFE).
 * Detectamos el BOM y decodificamos apropiadamente.
 */
function decodeContent(buffer) {
  // BOM de UTF-16 LE: 0xFF 0xFE
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return buffer.toString('utf16le')
  }
  // BOM de UTF-8: 0xEF 0xBB 0xBF
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.slice(3).toString('utf8')
  }
  return buffer.toString('utf8')
}

// ── Ruta por defecto de PokerStars ───────────────────────────────

/**
 * getDefaultHHPath() → string | null
 * Devuelve la ruta predeterminada de HandHistory según el OS.
 * El usuario puede sobrescribirla desde la UI.
 */
function getDefaultHHPath() {
  const home = require('os').homedir()

  const candidates = [
    // Windows
    path.join(home, 'AppData', 'Local', 'PokerStars', 'HandHistory'),
    path.join(home, 'AppData', 'Local', 'PokerStars.EU', 'HandHistory'),
    path.join('C:', 'Users', 'Public', 'PokerStars', 'HandHistory'),
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

module.exports = { HandHistoryWatcher, getDefaultHHPath }