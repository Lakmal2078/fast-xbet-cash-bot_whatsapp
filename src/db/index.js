const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const config = require('../config');
const logger = require('../utils/logger');

fs.mkdirSync(path.dirname(config.DATABASE_FILE), { recursive: true });

const db = new Database(config.DATABASE_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function get(sql, params = []) { return db.prepare(sql).get(...params); }
function all(sql, params = []) { return db.prepare(sql).all(...params); }
function run(sql, params = []) { return db.prepare(sql).run(...params); }

/**
 * Wrap a callback in a SQLite transaction.
 * The callback receives no arguments; use closures to pass data.
 * Rolls back automatically on any exception.
 */
function transaction(fn) { return db.transaction(fn)(); }

function ensureColumn(table, column, definition) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      logger.info({ table, column }, 'Added missing column');
    }
  } catch (e) {
    logger.warn({ err: e.message, table, column }, 'ensureColumn failed');
  }
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      jid TEXT PRIMARY KEY,
      privacy_pref TEXT NOT NULL DEFAULT 'standard',
      lang TEXT NOT NULL DEFAULT 'si',
      last_welcome_at INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sort_key INTEGER UNIQUE NOT NULL,
      bank_name TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      account_number TEXT NOT NULL,
      display_number TEXT NOT NULL,
      branch TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL,
      player_id TEXT,
      bank_name TEXT,
      amount REAL,
      amount_text TEXT,
      detected_date_time TEXT,
      reference TEXT,
      sender TEXT,
      receiver TEXT,
      image_hash TEXT UNIQUE,
      ai_result TEXT,
      status TEXT NOT NULL DEFAULT 'AI_REVIEW',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL,
      player_id TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_text TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_jid TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS conversation_states (
      jid TEXT PRIMARY KEY,
      step TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
    CREATE INDEX IF NOT EXISTS idx_chat_history_jid ON chat_history(jid, created_at);
  `);

  // පැරණි DB වලට columns auto-add
  ensureColumn('deposits', 'reference', 'TEXT');
  ensureColumn('deposits', 'sender', 'TEXT');
  ensureColumn('deposits', 'receiver', 'TEXT');
  ensureColumn('deposits', 'rejection_reason', 'TEXT');
  ensureColumn('deposits', 'is_deleted', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'last_welcome_at', 'INTEGER');
  ensureColumn('users', 'lang', "TEXT NOT NULL DEFAULT 'si'");
  ensureColumn('users', 'saved_bank', 'TEXT');
  ensureColumn('withdrawals', 'rejection_reason', 'TEXT');
  ensureColumn('withdrawals', 'payout_reference', 'TEXT');
  ensureColumn('withdrawals', 'paid_at', 'DATETIME');
  ensureColumn('withdrawals', 'processed_by', 'TEXT');
}

function seedBanks() {
  const row = get('SELECT COUNT(*) AS count FROM bank_accounts');
  if (row.count > 0) return;
  const banks = [
    [1, 'Bank of Ceylon (BOC)', 'Vgs Lakmal', '95645895', '956 45 895', 'Walasmulla'],
    [2, "People's Bank", 'Vgs Lakmal', '120200380030196', '1202-0038-0030196', 'Main Branch'],
    [3, 'Sampath Bank', 'Nks Oshadhi', '105456146706', '1054-5614-6706', 'Main Branch'],
    [4, 'LOLC Finance', 'Vgs Lakmal', '01210012722', '012 100 12722', 'Main Branch'],
    [5, 'iPay', 'Vgs Lakmal', '0740452530', '074 045 2530', 'Mobile Wallet']
  ];
  const insert = db.prepare(`INSERT INTO bank_accounts (sort_key, bank_name, account_holder, account_number, display_number, branch, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`);
  const tx = db.transaction((items) => { for (const it of items) insert.run(...it); });
  tx(banks);
  logger.info('Bank accounts seeded');
}

function initDatabase() {
  migrate();
  seedBanks();
  logger.info('Database initialized');
}

function cleanExpiredStates() {
  run('DELETE FROM conversation_states WHERE expires_at < ?', [Date.now()]);
}

function getState(jid) {
  cleanExpiredStates();
  const row = get('SELECT * FROM conversation_states WHERE jid = ?', [jid]);
  if (!row) return null;
  let payload = {};
  try { payload = JSON.parse(row.payload || '{}'); } catch { payload = {}; }
  return { step: row.step, expires: row.expires_at, ...payload };
}

function setState(jid, state) {
  const { step, expires, ...payload } = state;
  run(`INSERT INTO conversation_states (jid, step, payload, expires_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(jid) DO UPDATE SET step=excluded.step, payload=excluded.payload, expires_at=excluded.expires_at`,
    [jid, step, JSON.stringify(payload), expires]);
}

function deleteState(jid) {
  run('DELETE FROM conversation_states WHERE jid = ?', [jid]);
}

// ─────────────────────────────────────────────
// Chat history — per-user conversation memory
// ─────────────────────────────────────────────

/**
 * Append a message to the user's chat history.
 * @param {string} jid
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
function addChatHistory(jid, role, content) {
  run(
    'INSERT INTO chat_history (jid, role, content, created_at) VALUES (?, ?, ?, ?)',
    [jid, role, content, Date.now()]
  );
  // Keep only the most recent 20 messages per user (prune older ones)
  run(
    `DELETE FROM chat_history
     WHERE jid = ?
       AND id NOT IN (
         SELECT id FROM chat_history WHERE jid = ? ORDER BY created_at DESC LIMIT 20
       )`,
    [jid, jid]
  );
}

/**
 * Retrieve the last N messages for a user as an array of { role, content }.
 * @param {string} jid
 * @param {number} limit
 */
function getChatHistory(jid, limit = 6) {
  const rows = all(
    'SELECT role, content FROM chat_history WHERE jid = ? ORDER BY created_at DESC LIMIT ?',
    [jid, limit]
  );
  // Return in chronological order (oldest first) for the messages array
  return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
}

/**
 * Clear a user's chat history (e.g. when they reset with "menu").
 */
function clearChatHistory(jid) {
  run('DELETE FROM chat_history WHERE jid = ?', [jid]);
}

function closeDatabase() { db.close(); }

module.exports = {
  get, all, run, transaction,
  initDatabase,
  getState, setState, deleteState,
  addChatHistory, getChatHistory, clearChatHistory,
  closeDatabase
};
