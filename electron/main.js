const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// Determine if running in dev mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Import database handlers
const db = require('./database')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    // icon is embedded in the exe by electron-builder; no runtime path needed
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('db:get-sequences', async () => {
  return db.handleGetSequences()
})

ipcMain.handle('db:generate-labels', async (_, params) => {
  return db.handleGenerateLabels(params)
})

ipcMain.handle('db:get-history', async (_, params) => {
  return db.handleGetHistory(params)
})

ipcMain.handle('db:get-batch', async (_, batchId) => {
  return db.handleGetBatch(batchId)
})

ipcMain.handle('db:get-settings', async () => {
  return db.handleGetSettings()
})

ipcMain.handle('db:save-settings', async (_, settings) => {
  return db.handleSaveSettings(settings)
})

ipcMain.handle('db:reset-sequence', async (_, processType) => {
  return db.handleResetSequence(processType)
})

ipcMain.handle('db:reset-all-sequences', async () => {
  return db.handleResetAllSequences()
})

ipcMain.handle('db:delete-batch', async (_, batchId) => {
  return db.handleDeleteBatch(batchId)
})

ipcMain.handle('db:clear-history', async () => {
  return db.handleClearHistory()
})

ipcMain.handle('dialog:save-backup', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Database',
    defaultPath: `palm-karofler-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  })
  if (!result.canceled && result.filePath) {
    return db.handleBackupDatabase(result.filePath)
  }
  return { success: false, canceled: true }
})

ipcMain.handle('dialog:save-pdf', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: defaultName || 'labels.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  return result
})

ipcMain.handle('fs:write-file', async (_, { filePath, buffer }) => {
  fs.writeFileSync(filePath, Buffer.from(buffer))
  return { success: true }
})

ipcMain.handle('shell:open-path', async (_, filePath) => {
  shell.openPath(filePath)
  return { success: true }
})

ipcMain.handle('app:get-version', async () => {
  return app.getVersion()
})

ipcMain.handle('app:get-data-path', async () => {
  return app.getPath('userData')
})

ipcMain.handle('print:labels', async (_, { html, printOptions }) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        ...printOptions
      },
      (success, errorType) => {
        printWindow.close()
        if (success) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: errorType })
        }
      }
    )
  })
})
