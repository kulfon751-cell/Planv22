// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: you can expose specific methods here if needed
  // For now, this is a placeholder for future features
  
  // Application info
  getVersion: () => process.versions,
  
  // File system operations (if needed later)
  // openFile: () => ipcRenderer.invoke('dialog:openFile'),
  // saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  
  // Window controls (if needed later)
  // minimize: () => ipcRenderer.invoke('window:minimize'),
  // maximize: () => ipcRenderer.invoke('window:maximize'),
  // close: () => ipcRenderer.invoke('window:close'),
})

// DOM ready
window.addEventListener('DOMContentLoaded', () => {
  // Any DOM manipulation or setup can go here
  console.log('Plan Produkcji Desktop - Preload script loaded')
})
