const db = require('../db');
const logger = require('../utils/logger');

const MS_24H = 24 * 60 * 60 * 1000;

function createDeposit({
  userJid, bankName = null, amount = null, amountText = null,
  detectedDateTime = null, reference = null, sender = null, receiver = null,
  imageHash = null, aiResult = null, status = 'AI_REVIEW'
}) {
  const aiJson = aiResult ? JSON.stringify(aiResult) : null;
  try {
    const result = db.run(
      `INSERT INTO deposits (user_jid, bank_name, amount, amount_text, detected_date_time, reference, sender, receiver, image_hash, ai_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userJid, bankName, amount, amountText, detectedDateTime, reference, sender, receiver, imageHash, aiJson, status]
    );
    return Number(result.lastInsertRowid);
  } catch (e) {
    // columns mismatch වුණත් record එකක් හදන්න (crash නෑ)
    logger.warn({ err: e.message }, 'Full deposit insert failed → minimal insert');
    const result = db.run(
      `INSERT INTO deposits (user_jid, bank_name, amount, amount_text, detected_date_time, image_hash, ai_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userJid, bankName, amount, amountText, detectedDateTime, imageHash, aiJson, status]
    );
    return Number(result.lastInsertRowid);
  }
}

function findByImageHash(imageHash) {
  return db.get('SELECT * FROM deposits WHERE image_hash = ?', [imageHash]);
}

function getDeposit(id) {
  return db.get('SELECT * FROM deposits WHERE id = ?', [id]);
}

function setPlayerId(id, playerId) {
  db.run(`UPDATE deposits SET player_id=?, status=CASE WHEN status='MANUAL_REVIEW' THEN 'MANUAL_REVIEW' ELSE 'PENDING' END, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [playerId, id]);
}

function setStatus(id, status) {
  db.run(`UPDATE deposits SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, id]);
}

function getPendingDeposits(limit = 10) {
  return db.all(`SELECT * FROM deposits WHERE status IN ('PENDING','AI_REVIEW','MANUAL_REVIEW') ORDER BY created_at DESC LIMIT ?`, [limit]);
}

function getUserDeposits(jid, limit = 10) {
  return db.all(
    `SELECT id, bank_name, amount_text, status, created_at
     FROM deposits WHERE user_jid = ?
     ORDER BY created_at DESC LIMIT ?`,
    [jid, limit]
  );
}

/** Find a deposit with a matching reference, optionally excluding a specific user. */
function findByReference(reference, excludeJid = null) {
  if (!reference) return null;
  if (excludeJid) {
    return db.get(
      `SELECT * FROM deposits WHERE reference = ? AND user_jid != ? LIMIT 1`,
      [reference, excludeJid]
    );
  }
  return db.get(`SELECT * FROM deposits WHERE reference = ? LIMIT 1`, [reference]);
}

/**
 * Check if a deposit with this reference already exists within the last 24 hours
 * (any user). Used to catch same-transaction re-submissions with a different image.
 */
function findByReferenceIn24h(reference) {
  if (!reference) return null;
  const cutoff = Math.floor((Date.now() - MS_24H) / 1000);
  return db.get(
    `SELECT * FROM deposits
     WHERE reference = ?
       AND created_at >= datetime(?, 'unixepoch')
     LIMIT 1`,
    [reference, cutoff]
  );
}

module.exports = {
  createDeposit,
  findByImageHash,
  findByReference,
  findByReferenceIn24h,
  getUserDeposits,
  getDeposit,
  setPlayerId,
  setStatus,
  getPendingDeposits
};
