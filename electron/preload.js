const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadData:    ()    => ipcRenderer.invoke('data:load'),
  saveData:    (d)   => ipcRenderer.invoke('data:save', d),
  getDataPath: ()    => ipcRenderer.invoke('data:get-path'),
})