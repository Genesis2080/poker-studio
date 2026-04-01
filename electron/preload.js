'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Datos de la app (data.json) ──────────────────────────────────
  loadData:    ()    => ipcRenderer.invoke('data:load'),
  saveData:    (d)   => ipcRenderer.invoke('data:save', d),
  getDataPath: ()    => ipcRenderer.invoke('data:get-path'),
  
  // ── Importador de Hand History ───────────────────────────────────

  // Control del watcher
  hhStart:          (folder) => ipcRenderer.invoke('hh:start', folder),
  hhStop:           ()       => ipcRenderer.invoke('hh:stop'),

  // Información
  hhGetStats:       ()       => ipcRenderer.invoke('hh:get-stats'),
  hhGetConfig:      ()       => ipcRenderer.invoke('hh:get-config'),
  hhGetDefaultPath: ()       => ipcRenderer.invoke('hh:get-default-path'),

  // Configuración de carpeta
  hhBrowseFolder:   ()       => ipcRenderer.invoke('hh:browse-folder'),
  hhSetFolder:      (folder) => ipcRenderer.invoke('hh:set-folder', folder),

  // Diagnóstico: parsear un archivo .txt manualmente
  hhDebugFile:      (fp)   => ipcRenderer.invoke('hh:debug-file', fp),

  // Sincronización: traer manos de SQLite → data.json
  hhSyncToApp:      (limit)  => ipcRenderer.invoke('hh:sync-to-app', limit),

  // Paginación directa desde SQLite
  dbGetHandsPage: (limit, offset) => ipcRenderer.invoke('db:get-hands-page', limit, offset),
  dbGetHandRawText: (handId) => ipcRenderer.invoke('db:get-hand-raw-text', handId),

  // ── Eventos push desde main.js → renderer ────────────────────────
  // Retornan una función de limpieza para usar en useEffect cleanup

  onHandsImported: (cb) => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('hh:hands-imported', listener)
    return () => ipcRenderer.removeListener('hh:hands-imported', listener)
  },

  onHHReady: (cb) => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('hh:ready', listener)
    return () => ipcRenderer.removeListener('hh:ready', listener)
  },

  onHHStatus: (cb) => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('hh:status', listener)
    return () => ipcRenderer.removeListener('hh:status', listener)
  },

  onHHError: (cb) => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('hh:error', listener)
    return () => ipcRenderer.removeListener('hh:error', listener)
  },

  // ── Replayer ──────────────────────────────────────────────────────
  openReplayer: (hand) => ipcRenderer.invoke('replayer:open', hand),
  closeReplayer: () => ipcRenderer.invoke('replayer:close'),
  getTempHand: () => ipcRenderer.invoke('replayer:get-temp-hand'),
  onReplayerLoadHand: (cb) => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('replayer:load-hand', listener)
    return () => ipcRenderer.removeListener('replayer:load-hand', listener)
  },
})