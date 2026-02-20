const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Database (sql.js — pure WebAssembly, no compilation needed) ──────────────

let _db = null
let _dbPath = null

async function initDb() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs({
    locateFile: file => {
      if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file)
      }
      return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
    },
  })

  _dbPath = path.join(app.getPath('userData'), 'palm-karofler.db')
  _db = fs.existsSync(_dbPath)
    ? new SQL.Database(fs.readFileSync(_dbPath))
    : new SQL.Database()

  _db.run('PRAGMA foreign_keys = ON')
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
  `)

  for (const type of ['R', 'S1', 'S2', 'P', 'L']) {
    _db.run('INSERT OR IGNORE INTO sequences (process_type, last_number) VALUES (?, ?)', [type, 0])
  }
  _db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('label_width', '60')")
  _db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('label_height', '40')")

  saveDb()
}

function saveDb() {
  if (_db && _dbPath) {
    fs.writeFileSync(_dbPath, Buffer.from(_db.export()))
  }
}

function getDb() {
  if (!_db) throw new Error('Database not initialised')
  return _db
}

function makeCode(type, n) {
  return `PALM-${type}-${String(n).padStart(6, '0')}`
}

function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function queryOne(sql, params = []) {
  const stmt = getDb().prepare(sql)
  if (params.length) stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

function dbGetSequences() {
  return queryAll('SELECT * FROM sequences ORDER BY process_type')
}

function dbGenerateLabels({ processType, supplier, quantity, mode }) {
  const db = getDb()
  db.run('BEGIN TRANSACTION')
  try {
    const seq = queryOne('SELECT last_number FROM sequences WHERE process_type = ?', [processType])
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

    const startCode = makeCode(processType, startNumber)
    const endCode   = makeCode(processType, endNumber)

    db.run(
      `UPDATE sequences SET last_number=?, updated_at=datetime('now') WHERE process_type=?`,
      [endNumber, processType]
    )
    db.run(
      `INSERT INTO batches (supplier,process_type,start_code,end_code,quantity,mode,start_number,end_number) VALUES (?,?,?,?,?,?,?,?)`,
      [supplier, processType, startCode, endCode, quantity, mode, startNumber, endNumber]
    )

    const batchId = queryOne('SELECT last_insert_rowid() as id').id
    db.run('COMMIT')
    saveDb()

    return { batchId, codes, startCode, endCode, startNumber, endNumber }
  } catch (err) {
    try { db.run('ROLLBACK') } catch (_) {}
    throw err
  }
}

function dbGetHistory({ page = 1, limit = 50 } = {}) {
  const rows  = queryAll('SELECT * FROM batches ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, (page - 1) * limit])
  const total = (queryOne('SELECT COUNT(*) as count FROM batches') || { count: 0 }).count
  return { rows, total, page, limit }
}

function dbGetBatch(batchId) {
  const batch = queryOne('SELECT * FROM batches WHERE id=?', [batchId])
  if (!batch) throw new Error('Batch not found')
  const codes = batch.mode === 'consecutive'
    ? Array.from({ length: batch.end_number - batch.start_number + 1 }, (_, i) => makeCode(batch.process_type, batch.start_number + i))
    : Array(batch.quantity).fill(batch.start_code)
  return { ...batch, codes }
}

function dbGetSettings() {
  return Object.fromEntries(queryAll('SELECT * FROM settings').map(r => [r.key, r.value]))
}

function dbSaveSettings(settings) {
  const db = getDb()
  for (const [k, v] of Object.entries(settings)) {
    db.run(
      `INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      [k, String(v)]
    )
  }
  saveDb()
  return { success: true }
}

function dbResetSequence(processType) {
  getDb().run(`UPDATE sequences SET last_number=0, updated_at=datetime('now') WHERE process_type=?`, [processType])
  saveDb()
  return { success: true }
}

function dbResetAllSequences() {
  getDb().run(`UPDATE sequences SET last_number=0, updated_at=datetime('now')`)
  saveDb()
  return { success: true }
}

function dbBackup(destPath) {
  fs.writeFileSync(destPath, Buffer.from(getDb().export()))
  return { success: true, path: destPath }
}

function dbDeleteBatch(id) {
  getDb().run('DELETE FROM batches WHERE id=?', [id])
  saveDb()
  return { success: true }
}

function dbClearHistory() {
  getDb().run('DELETE FROM batches')
  saveDb()
  return { success: true }
}

// ─── Window ───────────────────────────────────────────────────────────────────

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: `Palm Karofler Labels v${app.getVersion()}`,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    loadDevUrl()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

function loadDevUrl() {
  mainWindow.loadURL('http://localhost:5173').catch(() => {
    setTimeout(loadDevUrl, 1000)
  })
}

app.whenReady().then(async () => {
  await initDb()
  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ─── IPC ─────────────────────────────────────────────────────────────────────

ipcMain.handle('db:get-sequences',       () => dbGetSequences())
ipcMain.handle('db:generate-labels',     (_, p) => dbGenerateLabels(p))
ipcMain.handle('db:get-history',         (_, p) => dbGetHistory(p))
ipcMain.handle('db:get-batch',           (_, id) => dbGetBatch(id))
ipcMain.handle('db:get-settings',        () => dbGetSettings())
ipcMain.handle('db:save-settings',       (_, s) => dbSaveSettings(s))
ipcMain.handle('db:reset-sequence',      (_, t) => dbResetSequence(t))
ipcMain.handle('db:reset-all-sequences', () => dbResetAllSequences())
ipcMain.handle('db:delete-batch',        (_, id) => dbDeleteBatch(id))
ipcMain.handle('db:clear-history',       () => dbClearHistory())

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
