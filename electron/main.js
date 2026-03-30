'use strict'

const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')

const { HandHistoryImporter, getDefaultHHPath } = require('./handHistory/importer')

// ── Dev vs producción ──────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── Persistencia de datos (data.json) ─────────────────────────────
const DATA_DIR  = path.join(app.getPath('userData'), 'poker-tracker')
const DATA_FILE = path.join(DATA_DIR, 'data.json')
const DB_FILE   = path.join(DATA_DIR, 'imported_hands.db')

function ensureDir()  { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }) }
function readData()   { ensureDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return {} } }
function writeData(d) { ensureDir(); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8') }

// ── Canales IPC existentes ─────────────────────────────────────────
ipcMain.handle('data:load',     ()     => readData())
ipcMain.handle('data:save',     (_, d) => { writeData(d); return true })
ipcMain.handle('data:get-path', ()     => DATA_FILE)

// Paginación directa desde SQLite
ipcMain.handle('db:get-hands-page', async (_, limit, offset) => {
  const { getDb, getHandsPage } = require('./db.js')
  // Aseguramos que cargamos la instancia de la base de datos
  const db = await getDb(DB_FILE)
  return getHandsPage(db, limit, offset)
})

// ── Importer (singleton) ──────────────────────────────────────────
let importer = null
let mainWindow = null

function getImporter() {
  if (!importer) {
    importer = new HandHistoryImporter({
      dbPath:   DB_FILE,
      hhFolder: loadImporterConfig().hhFolder || getDefaultHHPath(),
    })
    attachImporterEvents(importer)
  }
  return importer
}

// ── Configuración persistente del importer ─────────────────────────
const CONFIG_FILE = path.join(DATA_DIR, 'importer-config.json')

function loadImporterConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) } catch { return {} }
}
function saveImporterConfig(cfg) {
  ensureDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8')
}

// ── Propagar eventos del importer al renderer ─────────────────────
function attachImporterEvents(imp) {
  // Nuevas manos importadas → push inmediato al renderer
  imp.on('handsImported', ({ hands, count, filePath, stats }) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:hands-imported', {
      hands,
      count,
      filePath: path.basename(filePath),
      stats,
    })
  })

  imp.on('ready', (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:ready', info)
  })

  imp.on('started', (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:status', { running: true, ...info })
  })

  imp.on('stopped', (stats) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:status', { running: false, stats })
  })

  imp.on('error', (err) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:error', { message: err.message })
  })

  imp.on('fileError', ({ filePath, error }) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('hh:file-error', { filePath: path.basename(filePath), error })
  })

  imp.on('parseError', ({ filePath, error }) => {
    // Errores de parseo son frecuentes (manos corruptas, etc.) — solo log
    console.warn('[importer] Parse error en', path.basename(filePath), ':', error)
  })
}

// ── Canales IPC del importer ──────────────────────────────────────

// Arrancar el watcher — async porque sql.js inicializa WASM de forma asíncrona
ipcMain.handle('hh:start', async (_, hhFolder) => {
  const imp    = getImporter()
  const folder = hhFolder || loadImporterConfig().hhFolder || getDefaultHHPath()

  if (!folder) {
    return { ok: false, error: 'No se encontró la carpeta HandHistory. Configúrala manualmente.' }
  }

  try {
    await imp.start(folder)
    saveImporterConfig({ ...loadImporterConfig(), hhFolder: folder })
    return { ok: true, folder }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// Detener el watcher
ipcMain.handle('hh:stop', () => {
  if (importer) {
    importer.stop()
    importer = null
  }
  return { ok: true }
})

// Estadísticas y estado
ipcMain.handle('hh:get-stats', () => {
  const imp = getImporter()
  return imp.getStats()
})

// Obtener la ruta por defecto de PokerStars según el OS
ipcMain.handle('hh:get-default-path', () => {
  return { path: getDefaultHHPath() }
})

// Abrir diálogo para seleccionar carpeta HandHistory manualmente
ipcMain.handle('hh:browse-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      'Seleccionar carpeta HandHistory de PokerStars',
    properties: ['openDirectory'],
    defaultPath: getDefaultHHPath() || app.getPath('home'),
  })
  if (result.canceled || !result.filePaths.length) return { canceled: true }
  const folder = result.filePaths[0]
  saveImporterConfig({ ...loadImporterConfig(), hhFolder: folder })
  return { canceled: false, folder }
})

// Guardar configuración de la carpeta (sin arrancar el watcher)
ipcMain.handle('hh:set-folder', (_, folder) => {
  saveImporterConfig({ ...loadImporterConfig(), hhFolder: folder })
  if (importer?.isRunning) importer.setFolder(folder)
  return { ok: true }
})

// Sincronizar manos importadas (de SQLite) hacia data.json
// El renderer llama a esto para traer las manos de PokerStars al estado de la app
ipcMain.handle('hh:sync-to-app', (_, limit = 200) => {
  const imp = getImporter()
  const newHands = imp.syncToApp(limit)

  if (!newHands.length) return { ok: true, added: 0 }

  // Leer data.json, añadir las manos nuevas, guardar
  const appData = readData()
  const existingIds = new Set((appData.hands || []).map(h => h.id))

  const toAdd = newHands.filter(h => !existingIds.has(h.id))

  if (toAdd.length) {
    appData.hands = [...toAdd, ...(appData.hands || [])]
    writeData(appData)

    // Marcar como sincronizadas en SQLite
    imp.confirmSync(toAdd.map(h => h.id))
  }

  return { ok: true, added: toAdd.length, total: newHands.length }
})

// Obtener la configuración guardada del importer
ipcMain.handle('hh:get-config', () => {
  const cfg = loadImporterConfig()
  return {
    hhFolder:     cfg.hhFolder || null,
    defaultPath:  getDefaultHHPath(),
  }
})

// Canal de diagnóstico: parsear un archivo manualmente y devolver resultado
ipcMain.handle('hh:debug-file', async (_, filePath) => {
  try {
    const { splitHands, parseHand, debugHand } = require('./handHistory/parser')
    const { decodeBuffer } = require('./handHistory/watcher')

    if (!fs.existsSync(filePath)) return { ok: false, error: 'El archivo no existe' }

    const raw      = fs.readFileSync(filePath)
    const content  = decodeBuffer(raw)
    const blocks   = splitHands(content)
    const sample   = blocks[0] ? parseHand(blocks[0]) : null

    return {
      ok:          true,
      fileSize:    raw.length,
      encoding:    raw[0] === 0xFF ? 'UTF-16 LE' : raw[0] === 0xEF ? 'UTF-8 BOM' : 'UTF-8',
      handsFound:  blocks.length,
      firstHand:   sample,
      rawSample:   content.slice(0, 400),
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── Ventana principal ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1200,
    height:    780,
    minWidth:  860,
    minHeight: 560,
    backgroundColor: '#0d0f14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Ciclo de vida de la app ────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  // Detener el importer limpiamente antes de salir
  if (importer) { importer.stop(); importer = null }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (importer) { importer.stop(); importer = null }
})