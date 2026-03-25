const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')

// ── Dev vs producción ──────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── Persistencia de datos ──────────────────────────────────
const DATA_DIR  = path.join(app.getPath('userData'), 'poker-tracker')
const DATA_FILE = path.join(DATA_DIR, 'data.json')

function ensureDir()  { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }) }
function readData()   { ensureDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return {} } }
function writeData(d) { ensureDir(); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8') }

ipcMain.handle('data:load',     ()      => readData())
ipcMain.handle('data:save',     (_, d)  => { writeData(d); return true })
ipcMain.handle('data:get-path', ()      => DATA_FILE)

// ── Ventana principal ──────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:    1200,
    height:   780,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#0d0f14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })