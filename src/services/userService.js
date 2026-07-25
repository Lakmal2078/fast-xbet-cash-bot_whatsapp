const db = require('../db');
const logger = require('../utils/logger');

const WELCOME_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Allowed value sets (whitelist) ──────────────────────────────────────────
const VALID_LANGS = new Set(['si', 'en']);
const VALID_PRIVACY_PREFS = new Set(['standard', 'delete']);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Guard: returns true when jid is a usable non-empty string. */
function _validJid(jid) {
  return typeof jid === 'string' && jid.trim().length > 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function getUser(jid) {
  if (!_validJid(jid)) return null;
  try {
    return db.get('SELECT * FROM users WHERE jid = ?', [jid]) ?? null;
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.getUser failed');
    return null;
  }
}

/**
 * Ensures the user exists in the DB.
 * Returns true if a new row was inserted (brand-new user).
 *
 * Race-condition fix: skip the pre-read and rely solely on
 * INSERT OR IGNORE + SQLite's UNIQUE constraint on jid.
 * Concurrent first-messages will both attempt the INSERT; exactly
 * one succeeds, the other is silently ignored — no duplicate rows.
 */
function ensureUser(jid) {
  if (!_validJid(jid)) return false;
  try {
    const result = db.run('INSERT OR IGNORE INTO users (jid) VALUES (?)', [jid]);
    return result.changes > 0; // true = new user
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.ensureUser failed');
    return false;
  }
}

/**
 * Returns true when the welcome message should be sent:
 * – brand-new user (no last_welcome_at), OR
 * – 24 hours have passed since the last welcome.
 */
function shouldSendWelcome(jid) {
  try {
    const user = getUser(jid);
    if (!user) return true;
    if (!user.last_welcome_at) return true;
    return Date.now() - user.last_welcome_at >= WELCOME_COOLDOWN_MS;
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.shouldSendWelcome failed');
    return false; // safe default: don't spam on error
  }
}

/** Records the current timestamp as the last-welcome-sent time. */
function recordWelcomeSent(jid) {
  if (!_validJid(jid)) return;
  try {
    db.run('UPDATE users SET last_welcome_at = ? WHERE jid = ?', [Date.now(), jid]);
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.recordWelcomeSent failed');
  }
}

/** Sets the user's privacy preference. Only 'standard' and 'delete' are accepted. */
function setPrivacyPref(jid, pref) {
  if (!_validJid(jid) || !VALID_PRIVACY_PREFS.has(pref)) {
    logger.warn({ jid, pref }, 'userService.setPrivacyPref: invalid args, skipped');
    return;
  }
  try {
    db.run('UPDATE users SET privacy_pref = ? WHERE jid = ?', [pref, jid]);
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.setPrivacyPref failed');
  }
}

/**
 * Deletes all data for a user in a single atomic transaction.
 * Transaction safety fix: if any DELETE fails, none are committed.
 */
function deleteUser(jid) {
  if (!_validJid(jid)) return;
  try {
    db.transaction(() => {
      db.run('DELETE FROM conversation_states WHERE jid = ?', [jid]);
      db.run('DELETE FROM chat_history WHERE jid = ?', [jid]);
      db.run('DELETE FROM deposits WHERE user_jid = ?', [jid]);
      db.run('DELETE FROM withdrawals WHERE user_jid = ?', [jid]);
      db.run('DELETE FROM users WHERE jid = ?', [jid]);
    });
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.deleteUser failed — rolled back');
  }
}

/** Returns the stored language for a user, defaulting to Sinhala ('si'). */
function getLanguage(jid) {
  try {
    const user = getUser(jid);
    return VALID_LANGS.has(user?.lang) ? user.lang : 'si';
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.getLanguage failed');
    return 'si';
  }
}

/** Sets the user's language. Only 'si' and 'en' are accepted. */
function setLanguage(jid, lang) {
  if (!_validJid(jid) || !VALID_LANGS.has(lang)) {
    logger.warn({ jid, lang }, 'userService.setLanguage: invalid args, skipped');
    return;
  }
  try {
    db.run('UPDATE users SET lang = ? WHERE jid = ?', [lang, jid]);
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.setLanguage failed');
  }
}

/** Returns the user's saved bank details object, or null. */
function getSavedBank(jid) {
  try {
    const user = getUser(jid);
    if (!user?.saved_bank) return null;
    return JSON.parse(user.saved_bank);
  } catch (err) {
    // JSON.parse failure or DB error — treat as no saved bank
    logger.warn({ err: err.message, jid }, 'userService.getSavedBank: parse failed, ignored');
    return null;
  }
}

/** Persists bank details JSON for the user's next withdrawal pre-fill. */
function saveBank(jid, bankDetails) {
  if (!_validJid(jid) || !bankDetails || typeof bankDetails !== 'object') return;
  try {
    db.run('UPDATE users SET saved_bank = ? WHERE jid = ?', [
      JSON.stringify(bankDetails),
      jid
    ]);
  } catch (err) {
    logger.error({ err: err.message, jid }, 'userService.saveBank failed');
  }
}

module.exports = {
  getUser,
  ensureUser,
  shouldSendWelcome,
  recordWelcomeSent,
  getLanguage,
  setLanguage,
  getSavedBank,
  saveBank,
  setPrivacyPref,
  deleteUser
};
