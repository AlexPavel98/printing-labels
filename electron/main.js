const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Database (inlined) ──────────────────────────────────────────────────────

const Database = require('better-sqlite3')

let _db = null

function getDb() {
  if (!_db) {
    const dbPath = path.join(app.getPath('userData'), 'palm-karofler.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    _db.exec(`
      CREATE TABLE IF NOT EXISTS sequences (
        process_type TEXT PRIMARY KEY,
        last_number  INTEGER NOT NULL DEFAULT 0,
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS batches (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier     TEXT NOT NULL,
        process_type TEXT NOT NULL,
        start_code   TEXT NOT NULL,
        end_code     TEXT NOT NULL,
        quantity     INTEGER NOT NULL,
        mode         TEXT NOT NULL CHECK(mode IN ('consecutive','identical')),
        start_number INTEGER NOT NULL,
        end_number   INTEGER NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO sequences (process_type, last_number) VALUES
        ('R',0),('S1',0),('S2',0),('P',0),('L',0);
      INSERT OR IGNORE INTO settings (key, value) VALUES
        ('label_width','60'),('label_height','40');
    `)
  }
  return _db
}

function makeCode(type, n) {
  return `PALM-${type}-${String(n).padStart(6, '0')}`
}

function dbGetSequences() {
  return getDb().prepare('SELECT * FROM sequences ORDER BY process_type').all()
}

function dbGenerateLabels({ processType, supplier, quantity, mode }) {
  const db = getDb()
  return db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM sequences WHERE process_type = ?').get(processType)
    if (!seq) throw new Error(`Unknown process type: ${processType}`)

    const startNumber = seq.last_number + 1
    let endNumber, codes

    if (mode === 'consecutive') {
      endNumber = startNumber + quantity - 1
      codes = []
      for (let i = startNumber; i <= endNumber; i++) codes.push(makeCode(processType, i))
    } else {
      endNumber = startNumber
      codes = Array(quantity).fill(makeCode(processType, startNumber))
    }

    db.prepare(`UPDATE sequences SET last_number=?, updated_at=datetime('now') WHERE process_type=?`)
      .run(endNumber, processType)

    const startCode = makeCode(processType, startNumber)
    const endCode   = makeCode(processType, endNumber)
    const r = db.prepare(`
      INSERT INTO batches (supplier,process_type,start_code,end_code,quantity,mode,start_number,end_number)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(supplier, processType, startCode, endCode, quantity, mode, startNumber, endNumber)

    return { batchId: r.lastInsertRowid, codes, startCode, endCode, startNumber, endNumber }
  })()
}

function dbGetHistory({ page = 1, limit = 50 } = {}) {
  const db = getDb()
  const rows  = db.prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, (page-1)*limit)
  const total = db.prepare('SELECT COUNT(*) as count FROM batches').get().count
  return { rows, total, page, limit }
}

function dbGetBatch(batchId) {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM batches WHERE id=?').get(batchId)
  if (!batch) throw new Error('Batch not found')
  const codes = batch.mode === 'consecutive'
    ? Array.from({ length: batch.end_number - batch.start_number + 1 }, (_, i) => makeCode(batch.process_type, batch.start_number + i))
    : Array(batch.quantity).fill(batch.start_code)
  return { ...batch, codes }
}

function dbGetSettings() {
  const rows = getDb().prepare('SELECT * FROM settings').all()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

function dbSaveSettings(settings) {
  const db = getDb()
  const upsert = db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
  db.transaction(s => { for (const [k,v] of Object.entries(s)) upsert.run(k, String(v)) })(settings)
  return { success: true }
}

function dbResetSequence(processType) {
  getDb().prepare(`UPDATE sequences SET last_number=0, updated_at=datetime('now') WHERE process_type=?`).run(processType)
  return { success: true }
}

function dbResetAllSequences() {
  getDb().prepare(`UPDATE sequences SET last_number=0, updated_at=datetime('now')`).run()
  return { success: true }
}

function dbBackup(destPath) {
  getDb().backup(destPath)
  return { success: true, path: destPath }
}

function dbDeleteBatch(id) {
  getDb().prepare('DELETE FROM batches WHERE id=?').run(id)
  return { success: true }
}

function dbClearHistory() {
  getDb().prepare('DELETE FROM batches').run()
  return { success: true }
}

// ─── Window ──────────────────────────────────────────────────────────────────

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ─── IPC ─────────────────────────────────────────────────────────────────────

ipcMain.handle('db:get-sequences',      () => dbGetSequences())
ipcMain.handle('db:generate-labels',    (_, p) => dbGenerateLabels(p))
ipcMain.handle('db:get-history',        (_, p) => dbGetHistory(p))
ipcMain.handle('db:get-batch',          (_, id) => dbGetBatch(id))
ipcMain.handle('db:get-settings',       () => dbGetSettings())
ipcMain.handle('db:save-settings',      (_, s) => dbSaveSettings(s))
ipcMain.handle('db:reset-sequence',     (_, t) => dbResetSequence(t))
ipcMain.handle('db:reset-all-sequences',() => dbResetAllSequences())
ipcMain.handle('db:delete-batch',       (_, id) => dbDeleteBatch(id))
ipcMain.handle('db:clear-history',      () => dbClearHistory())

ipcMain.handle('dialog:save-backup', async () => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Database',
    defaultPath: `palm-karofler-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (!r.canceled && r.filePath) return dbBackup(r.filePath)
  return { success: false, canceled: true }
})

ipcMain.handle('dialog:save-pdf', async (_, name) => {
  return dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: name || 'labels.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
})

ipcMain.handle('fs:write-file', (_, { filePath, buffer }) => {
  fs.writeFileSync(filePath, Buffer.from(buffer))
  return { success: true }
})

ipcMain.handle('shell:open-path', (_, p) => { shell.openPath(p); return { success: true } })
ipcMain.handle('app:get-version',   () => app.getVersion())
ipcMain.handle('app:get-data-path', () => app.getPath('userData'))

ipcMain.handle('print:labels', async (_, { html }) => {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  return new Promise(resolve => {
    win.webContents.print({ silent: false, printBackground: true }, (ok, err) => {
      win.close()
      resolve(ok ? { success: true } : { success: false, error: err })
    })
  })
})
