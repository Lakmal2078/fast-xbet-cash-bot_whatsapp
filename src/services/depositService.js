const db = require('../db');
const logger = require('../utils/logger');

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

module.exports = { createDeposit, findByImageHash, getDeposit, setPlayerId, setStatus, getPendingDeposits };