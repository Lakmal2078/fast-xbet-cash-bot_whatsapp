const db = require('../db');

function getUser(jid) {
  return db.get('SELECT * FROM users WHERE jid = ?', [jid]);
}

function ensureUser(jid) {
  const existing = getUser(jid);

  if (!existing) {
    db.run('INSERT OR IGNORE INTO users (jid) VALUES (?)', [jid]);
    return true;
  }

  return false;
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

module.exports = {
  getUser,
  ensureUser,
  setPrivacyPref,
  deleteUser
};