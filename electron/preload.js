const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Database
  getSequences: () => ipcRenderer.invoke('db:get-sequences'),
  generateLabels: (params) => ipcRenderer.invoke('db:generate-labels', params),
  getHistory: (params) => ipcRenderer.invoke('db:get-history', params),
  getBatch: (batchId) => ipcRenderer.invoke('db:get-batch', batchId),
  deleteBatch: (batchId) => ipcRenderer.invoke('db:delete-batch', batchId),
  clearHistory: () => ipcRenderer.invoke('db:clear-history'),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:save-settings', settings),
  resetSequence: (processType) => ipcRenderer.invoke('db:reset-sequence', processType),
  resetAllSequences: () => ipcRenderer.invoke('db:reset-all-sequences'),

  // File system
  saveBackup: () => ipcRenderer.invoke('dialog:save-backup'),
  savePdf: (defaultName) => ipcRenderer.invoke('dialog:save-pdf', defaultName),
  writeFile: (params) => ipcRenderer.invoke('fs:write-file', params),
  openPath: (filePath) => ipcRenderer.invoke('shell:open-path', filePath),

  // Print
  printLabels: (params) => ipcRenderer.invoke('print:labels', params),

  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getDataPath: () => ipcRenderer.invoke('app:get-data-path'),
})
