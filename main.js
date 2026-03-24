const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Ruta de datos persistentes ──────────────────────────────────────────────
const DATA_DIR  = path.join(app.getPath('userData'), 'poker-study');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return {}; }
}

function writeData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('data:load', () => readData());

ipcMain.handle('data:save', (_event, data) => {
  writeData(data);
  return true;
});

ipcMain.handle('data:get-path', () => DATA_FILE);

// ── Ventana principal ─────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'renderer', 'icon.png'),
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Abrir DevTools solo en modo dev
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});