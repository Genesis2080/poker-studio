'use strict'

/**
 * db.js  —  capa SQLite usando sql.js (WebAssembly)
 * ─────────────────────────────────────────────────────────────────
 * Por qué sql.js en lugar de better-sqlite3:
 *
 *   better-sqlite3 tiene código C++ nativo que hay que compilar para
 *   cada combinación de Node/Electron/OS. En Node v24+ o con MSVC
 *   antiguo esa compilación falla.
 *
 *   sql.js es SQLite compilado a WebAssembly — no hay nada que compilar,
 *   funciona en cualquier plataforma sin herramientas de build.
 *
 * Diferencias de uso respecto a better-sqlite3:
 *
 *   1. getDb() devuelve una Promise (la inicialización del WASM es async).
 *      Todas las funciones que necesitan la DB son también async.
 *
 *   2. La DB vive en memoria. Para persistir a disco llamamos a _save()
 *      después de cada escritura. Esto es seguro: sql.js exporta un
 *      Uint8Array que escribimos con fs.writeFileSync de forma atómica.
 *
 *   3. El rendimiento es excelente para miles de manos. sql.js procesa
 *      100 000 inserciones en < 2 segundos en máquinas modernas.
 *
 * API pública — idéntica a la versión better-sqlite3:
 *   getDb, closeDb,
 *   getOffset, setOffset,
 *   handExists, insertHands,
 *   getUnsynced, markSynced,
 *   getStats, getAllFileOffsets
 */

const fs   = require('fs')
const path = require('path')

// ── Singleton ────────────────────────────────────────────────────
let _db      = null   // instancia sql.js Database
let _dbPath  = null   // ruta en disco para persistir
let _initProm= null   // Promise de inicialización (evita doble init)

// ── Inicialización ────────────────────────────────────────────────

/**
 * getDb(dbPath) → Promise<Database>
 *
 * Carga sql.js, abre (o crea) la base de datos y devuelve la instancia.
 * Es seguro llamarlo varias veces — devuelve el singleton.
 */
async function getDb(dbPath) {
  if (_db) return _db
  if (_initProm) return _initProm   // evitar doble inicialización concurrente

  _initProm = _init(dbPath)
  return _initProm
}

async function _init(dbPath) {
  _dbPath = dbPath
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  // Cargar sql.js — el módulo exporta una función factory
  const initSqlJs = require('sql.js')

  // sql.js busca el archivo .wasm junto al JS. En Electron empaquetado
  // puede estar en una ruta diferente, así que lo localizamos explícitamente.
  const wasmPath = path.join(
    path.dirname(require.resolve('sql.js')),
    'sql-wasm.wasm'
  )

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })

  // Si ya existe un archivo .db en disco, cargarlo; si no, crear vacío
  let fileBuffer = null
  if (fs.existsSync(dbPath)) {
    try { fileBuffer = fs.readFileSync(dbPath) } catch { fileBuffer = null }
  }

  _db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database()

  // Pragmas de rendimiento
  _db.run('PRAGMA journal_mode = MEMORY')   // en memoria no tiene sentido WAL
  _db.run('PRAGMA synchronous = OFF')
  _db.run('PRAGMA foreign_keys = ON')
  _db.run('PRAGMA cache_size = -8000')      // 8MB de caché de páginas

  _initSchema(_db)
  return _db
}

/**
 * closeDb() — libera la instancia y guarda a disco
 */
function closeDb() {
  if (_db) {
    _save()
    _db.close()
    _db     = null
    _dbPath = null
    _initProm = null
  }
}

// ── Persistencia a disco ──────────────────────────────────────────

/**
 * _save() — exporta la DB en memoria a un archivo binario en disco.
 * Usa escritura atómica (temp file + rename) para evitar corrupción.
 */
function _save() {
  if (!_db || !_dbPath) return
  try {
    const data  = _db.export()          // Uint8Array con el binario SQLite
    const buf   = Buffer.from(data)
    const tmp   = _dbPath + '.tmp'
    fs.writeFileSync(tmp, buf)
    fs.renameSync(tmp, _dbPath)         // rename es atómico en la mayoría de OS
  } catch (err) {
    console.error('[db] Error guardando DB a disco:', err.message)
  }
}

// ── Esquema ───────────────────────────────────────────────────────
function _initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS imported_hands (
      id              TEXT    PRIMARY KEY,
      hand_id         TEXT    NOT NULL,
      imported_at     INTEGER NOT NULL,
      date            TEXT    NOT NULL,
      position        TEXT    DEFAULT '',
      result          TEXT    DEFAULT 'even',
      hero_hand       TEXT    DEFAULT '',
      villain_range   TEXT    DEFAULT '',
      preflop_action  TEXT    DEFAULT '',
      street          TEXT    DEFAULT '',
      board           TEXT    DEFAULT '',
      notes           TEXT    DEFAULT '',
      tags            TEXT    DEFAULT '[]',
      hero_name       TEXT    DEFAULT '',
      hero_stack      REAL    DEFAULT 0,
      pot_size        REAL    DEFAULT 0,
      rake            REAL    DEFAULT 0,
      pot_won         REAL    DEFAULT 0,
      stakes          TEXT    DEFAULT '',
      table_name      TEXT    DEFAULT '',
      table_format    TEXT    DEFAULT '',
      game_type       TEXT    DEFAULT '',
      raw_text        TEXT    DEFAULT '',
      source          TEXT    DEFAULT 'pokerstars',
      synced_to_app   INTEGER DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS file_offsets (
      file_path   TEXT    PRIMARY KEY,
      offset      INTEGER NOT NULL DEFAULT 0,
      last_seen   INTEGER NOT NULL DEFAULT 0,
      hand_count  INTEGER NOT NULL DEFAULT 0
    )
  `)

  // sql.js no admite CREATE INDEX IF NOT EXISTS en todas las versiones,
  // así que lo envolvemos en un try individual por cada índice
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ih_date     ON imported_hands(date)',
    'CREATE INDEX IF NOT EXISTS idx_ih_result   ON imported_hands(result)',
    'CREATE INDEX IF NOT EXISTS idx_ih_synced   ON imported_hands(synced_to_app)',
    'CREATE INDEX IF NOT EXISTS idx_ih_imported ON imported_hands(imported_at)',
  ]
  for (const sql of indexes) {
    try { db.run(sql) } catch {}
  }
}

// ── Helpers de consulta ───────────────────────────────────────────

/**
 * _get(db, sql, params) → row | undefined
 * Equivalente a stmt.get() de better-sqlite3
 */
function _get(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : undefined
  stmt.free()
  return row
}

/**
 * _all(db, sql, params) → row[]
 * Equivalente a stmt.all() de better-sqlite3
 */
function _all(db, sql, params = []) {
  const stmt   = db.prepare(sql)
  const rows   = []
  stmt.bind(params)
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

/**
 * _run(db, sql, params) → void
 * Equivalente a stmt.run() de better-sqlite3
 */
function _run(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
}

// ── API pública: file_offsets ─────────────────────────────────────

function getOffset(db, filePath) {
  if (!db) return 0
  const row = _get(db, 'SELECT offset FROM file_offsets WHERE file_path = ?', [filePath])
  return row ? (row.offset || 0) : 0
}

function setOffset(db, filePath, offset, handCount = 0) {
  if (!db) return
  _run(db, `
    INSERT INTO file_offsets (file_path, offset, last_seen, hand_count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      offset     = excluded.offset,
      last_seen  = excluded.last_seen,
      hand_count = file_offsets.hand_count + excluded.hand_count
  `, [filePath, offset, Date.now(), handCount])
  // No guardamos a disco en cada offset — es muy frecuente.
  // El importer llama a _save() tras insertHands().
}

// ── API pública: imported_hands ───────────────────────────────────

function handExists(db, handId) {
  if (!db) return false
  const row = _get(db, 'SELECT 1 as n FROM imported_hands WHERE id = ?', ['ps-' + handId])
  return !!row
}

/**
 * insertHands(db, hands[]) → number
 * Inserta un lote de manos. Retorna el número insertado (sin duplicados).
 */
function insertHands(db, hands) {
  if (!db || !hands.length) return 0

  const sql = `
    INSERT OR IGNORE INTO imported_hands (
      id, hand_id, imported_at, date, position, result,
      hero_hand, villain_range, preflop_action, street, board,
      notes, tags, hero_name, hero_stack, pot_size, rake,
      pot_won, stakes, table_name, table_format, game_type,
      raw_text, source, synced_to_app
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 0
    )
  `
  const stmt = db.prepare(sql)

  // Contar cuántas hay antes para calcular las insertadas
  const before = _get(db, 'SELECT COUNT(*) as n FROM imported_hands').n || 0

  db.run('BEGIN')
  try {
    for (const h of hands) {
      stmt.run([
        h.id,
        h.handId,
        h.importedAt || Date.now(),
        h.date,
        h.position      || '',
        h.result        || 'even',
        h.heroHand      || '',
        h.villainRange  || '',
        h.preflopAction || '',
        h.street        || '',
        h.board         || '',
        h.notes         || '',
        JSON.stringify(h.tags || []),
        h.heroName      || '',
        h.heroStack     || 0,
        h.potSize       || 0,
        h.rake          || 0,
        h.potWon        || 0,
        h.stakes        || '',
        h.tableName     || '',
        h.tableFormat   || '',
        h.gameType      || '',
        h.rawText       || '',
        h.source        || 'pokerstars',
      ])
    }
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    console.error('[db] insertHands error:', err.message)
    return 0
  } finally {
    stmt.free()
  }

  const after = _get(db, 'SELECT COUNT(*) as n FROM imported_hands').n || 0
  const inserted = after - before

  // Persistir a disco después de cada lote de inserciones
  if (inserted > 0) _save()

  return inserted
}

function getUnsynced(db, limit = 500) {
  if (!db) return []
  const rows = _all(db,
    'SELECT * FROM imported_hands WHERE synced_to_app = 0 ORDER BY imported_at ASC LIMIT ?',
    [limit]
  )
  return rows.map(rowToHand)
}

function markSynced(db, ids) {
  if (!db || !ids.length) return
  // sql.js no admite arrays en bind directamente → insertar uno a uno en transacción
  db.run('BEGIN')
  for (const id of ids) {
    _run(db, 'UPDATE imported_hands SET synced_to_app = 1 WHERE id = ?', [id])
  }
  db.run('COMMIT')
  _save()
}

function getStats(db) {
  if (!db) return { total: 0, synced: 0, unsynced: 0, byResult: {} }
  const total    = (_get(db, 'SELECT COUNT(*) as n FROM imported_hands')?.n) || 0
  const synced   = (_get(db, 'SELECT COUNT(*) as n FROM imported_hands WHERE synced_to_app = 1')?.n) || 0
  const byResult = {}
  const rows     = _all(db, 'SELECT result, COUNT(*) as n FROM imported_hands GROUP BY result')
  for (const r of rows) byResult[r.result] = r.n
  return { total, synced, unsynced: total - synced, byResult }
}

function getAllFileOffsets(db) {
  if (!db) return []
  return _all(db, 'SELECT file_path, offset, last_seen, hand_count FROM file_offsets')
    .map(r => ({
      filePath:  r.file_path,
      offset:    r.offset,
      lastSeen:  r.last_seen,
      handCount: r.hand_count,
    }))
}

// ── Conversión fila → objeto de la app ────────────────────────────
function rowToHand(row) {
  return {
    id:              row.id,
    handId:          row.hand_id,
    importedAt:      row.imported_at,
    date:            row.date,
    position:        row.position        || '',
    result:          row.result          || 'even',
    heroHand:        row.hero_hand       || '',
    villainRange:    row.villain_range   || '',
    villainRangeKeys:[],
    preflopAction:   row.preflop_action  || '',
    street:          row.street          || '',
    board:           row.board           || '',
    notes:           row.notes           || '',
    tags:            _parseJSON(row.tags, []),
    heroName:        row.hero_name       || '',
    heroStack:       row.hero_stack      || 0,
    potSize:         row.pot_size        || 0,
    rake:            row.rake            || 0,
    potWon:          row.pot_won         || 0,
    stakes:          row.stakes          || '',
    tableName:       row.table_name      || '',
    tableFormat:     row.table_format    || '',
    gameType:        row.game_type       || '',
    source:          row.source          || 'pokerstars',
  }
}

function _parseJSON(str, fallback) {
  try { return JSON.parse(str) } catch { return fallback }
}

// ── Exportar ─────────────────────────────────────────────────────
module.exports = {
  getDb, closeDb,
  getOffset, setOffset,
  handExists, insertHands,
  getUnsynced, markSynced,
  getStats, getAllFileOffsets,
}