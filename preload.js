const { contextBridge, ipcRenderer } = require('electron');

// Expone una API segura al renderer sin exponer Node directamente
contextBridge.exposeInMainWorld('electronAPI', {
  loadData:   ()       => ipcRenderer.invoke('data:load'),
  saveData:   (data)   => ipcRenderer.invoke('data:save', data),
  getDataPath: ()      => ipcRenderer.invoke('data:get-path'),
});