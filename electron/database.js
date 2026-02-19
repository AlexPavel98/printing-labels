const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'palm-karofler.db')
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath()
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeDatabase(db)
  }
  return db
}

function initializeDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sequences (
      process_type TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier TEXT NOT NULL,
      process_type TEXT NOT NULL,
      start_code TEXT NOT NULL,
      end_code TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('consecutive', 'identical')),
      start_number INTEGER NOT NULL,
      end_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO sequences (process_type, last_number) VALUES
      ('R', 0),
      ('S1', 0),
      ('S2', 0),
      ('P', 0),
      ('L', 0);

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('label_width', '60'),
      ('label_height', '40'),
      ('label_font_size', '10'),
      ('dark_mode', 'false');
  `)
}

function generateCode(processType, number) {
  const padded = String(number).padStart(6, '0')
  return `PALM-${processType}-${padded}`
}

// IPC Handlers
function handleGetSequences() {
  const database = getDb()
  const rows = database.prepare('SELECT * FROM sequences ORDER BY process_type').all()
  return rows
}

function handleGenerateLabels({ processType, supplier, quantity, mode }) {
  const database = getDb()

  const generateTransaction = database.transaction(() => {
    const seq = database.prepare('SELECT last_number FROM sequences WHERE process_type = ?').get(processType)
    if (!seq) throw new Error(`Unknown process type: ${processType}`)

    const startNumber = seq.last_number + 1
    let endNumber
    let codes = []

    if (mode === 'consecutive') {
      endNumber = startNumber + quantity - 1
      for (let i = startNumber; i <= endNumber; i++) {
        codes.push(generateCode(processType, i))
      }
    } else {
      // identical mode: one code repeated N times
      endNumber = startNumber
      const code = generateCode(processType, startNumber)
      codes = Array(quantity).fill(code)
    }

    // Update sequence
    database.prepare(`
      UPDATE sequences SET last_number = ?, updated_at = datetime('now')
      WHERE process_type = ?
    `).run(endNumber, processType)

    // Record batch
    const startCode = generateCode(processType, startNumber)
    const endCode = generateCode(processType, endNumber)

    const result = database.prepare(`
      INSERT INTO batches (supplier, process_type, start_code, end_code, quantity, mode, start_number, end_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(supplier, processType, startCode, endCode, quantity, mode, startNumber, endNumber)

    return {
      batchId: result.lastInsertRowid,
      codes,
      startCode,
      endCode,
      startNumber,
      endNumber
    }
  })

  return generateTransaction()
}

function handleGetHistory({ page = 1, limit = 50 } = {}) {
  const database = getDb()
  const offset = (page - 1) * limit
  const rows = database.prepare(`
    SELECT * FROM batches
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)
  const total = database.prepare('SELECT COUNT(*) as count FROM batches').get()
  return { rows, total: total.count, page, limit }
}

function handleGetBatch(batchId) {
  const database = getDb()
  const batch = database.prepare('SELECT * FROM batches WHERE id = ?').get(batchId)
  if (!batch) throw new Error('Batch not found')

  let codes = []
  if (batch.mode === 'consecutive') {
    for (let i = batch.start_number; i <= batch.end_number; i++) {
      codes.push(generateCode(batch.process_type, i))
    }
  } else {
    codes = Array(batch.quantity).fill(batch.start_code)
  }

  return { ...batch, codes }
}

function handleGetSettings() {
  const database = getDb()
  const rows = database.prepare('SELECT * FROM settings').all()
  const settings = {}
  rows.forEach(row => { settings[row.key] = row.value })
  return settings
}

function handleSaveSettings(settings) {
  const database = getDb()
  const upsert = database.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
  const saveAll = database.transaction((s) => {
    for (const [key, value] of Object.entries(s)) {
      upsert.run(key, String(value))
    }
  })
  saveAll(settings)
  return { success: true }
}

function handleResetSequence(processType) {
  const database = getDb()
  database.prepare(`
    UPDATE sequences SET last_number = 0, updated_at = datetime('now')
    WHERE process_type = ?
  `).run(processType)
  return { success: true }
}

function handleResetAllSequences() {
  const database = getDb()
  database.prepare(`
    UPDATE sequences SET last_number = 0, updated_at = datetime('now')
  `).run()
  return { success: true }
}

function handleBackupDatabase(destPath) {
  const database = getDb()
  database.backup(destPath)
  return { success: true, path: destPath }
}

function handleDeleteBatch(batchId) {
  const database = getDb()
  database.prepare('DELETE FROM batches WHERE id = ?').run(batchId)
  return { success: true }
}

function handleClearHistory() {
  const database = getDb()
  database.prepare('DELETE FROM batches').run()
  return { success: true }
}

module.exports = {
  getDb,
  getDbPath,
  handleGetSequences,
  handleGenerateLabels,
  handleGetHistory,
  handleGetBatch,
  handleGetSettings,
  handleSaveSettings,
  handleResetSequence,
  handleResetAllSequences,
  handleBackupDatabase,
  handleDeleteBatch,
  handleClearHistory
}
