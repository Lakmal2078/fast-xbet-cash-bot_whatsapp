const db = require('../db');

const WELCOME_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getUser(jid) {
  return db.get('SELECT * FROM users WHERE jid = ?', [jid]);
}

/**
 * Ensures the user exists in the DB.
 * Returns true if the user is brand-new (first ever message).
 */
function ensureUser(jid) {
  const existing = getUser(jid);

  if (!existing) {
    db.run('INSERT OR IGNORE INTO users (jid) VALUES (?)', [jid]);
    return true;
  }

  return false;
}

/**
 * Returns true if the welcome message should be sent:
 * - Brand-new user (no last_welcome_at), OR
 * - 24 hours have passed since the last welcome.
 */
function shouldSendWelcome(jid) {
  const user = getUser(jid);
  if (!user) return true;
  if (!user.last_welcome_at) return true;
  return Date.now() - user.last_welcome_at >= WELCOME_COOLDOWN_MS;
}

/**
 * Records the current time as the last welcome sent timestamp.
 */
function recordWelcomeSent(jid) {
  db.run('UPDATE users SET last_welcome_at = ? WHERE jid = ?', [Date.now(), jid]);
}

function setPrivacyPref(jid, pref) {
  db.run('UPDATE users SET privacy_pref = ? WHERE jid = ?', [pref, jid]);
}

function deleteUser(jid) {
  db.run('DELETE FROM conversation_states WHERE jid = ?', [jid]);
  db.run('DELETE FROM deposits WHERE user_jid = ?', [jid]);
  db.run('DELETE FROM withdrawals WHERE user_jid = ?', [jid]);
  db.run('DELETE FROM users WHERE jid = ?', [jid]);
}

function getLanguage(jid) {
  const user = getUser(jid);
  return user?.lang || 'si';
}

function setLanguage(jid, lang) {
  db.run('UPDATE users SET lang = ? WHERE jid = ?', [lang, jid]);
}

module.exports = {
  getUser,
  ensureUser,
  shouldSendWelcome,
  recordWelcomeSent,
  getLanguage,
  setLanguage,
  setPrivacyPref,
  deleteUser
};