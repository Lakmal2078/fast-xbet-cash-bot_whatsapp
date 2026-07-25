const db = require('../db');
const logger = require('../utils/logger');

const MS_24H = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// Internal helper: normalize a reference string
// for consistent storage and querying.
// "REF 123", "ref123", " ref123 " → "ref123"
// ─────────────────────────────────────────────
function normalizeRef(ref) {
  if (!ref) return null;
  const s = String(ref).trim().replace(/\s+/g, '').toLowerCase();
  return s.length >= 4 ? s : null;
}

// ─────────────────────────────────────────────
// Create a new deposit record
// ─────────────────────────────────────────────
function createDeposit({
  userJid, bankName = null, amount = null, amountText = null,
  detectedDateTime = null, reference = null, sender = null, receiver = null,
  imageHash = null, aiResult = null, status = 'AI_REVIEW'
}) {
  const aiJson = aiResult ? JSON.stringify(aiResult) : null;
  // Normalize reference at storage time so all records are consistent
  const normalizedRef = normalizeRef(reference);

  try {
    const result = db.run(
      `INSERT INTO deposits
         (user_jid, bank_name, amount, amount_text, detected_date_time,
          reference, sender, receiver, image_hash, ai_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userJid, bankName, amount, amountText, detectedDateTime,
       normalizedRef, sender, receiver, imageHash, aiJson, status]
    );
    return Number(result.lastInsertRowid);
  } catch (e) {
    logger.warn({ err: e.message }, 'Full deposit insert failed → minimal insert');
    const result = db.run(
      `INSERT INTO deposits
         (user_jid, bank_name, amount, amount_text, detected_date_time,
          image_hash, ai_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userJid, bankName, amount, amountText, detectedDateTime, imageHash, aiJson, status]
    );
    return Number(result.lastInsertRowid);
  }
}

// ─────────────────────────────────────────────
// Basic lookups
// ─────────────────────────────────────────────
function findByImageHash(imageHash) {
  return db.get(
    'SELECT * FROM deposits WHERE image_hash = ? AND COALESCE(is_deleted, 0) = 0',
    [imageHash]
  );
}

function getDeposit(id) {
  return db.get('SELECT * FROM deposits WHERE id = ?', [id]);
}

// ─────────────────────────────────────────────
// Status updates
// ─────────────────────────────────────────────
function setPlayerId(id, playerId) {
  db.run(
    `UPDATE deposits
     SET player_id = ?,
         status = CASE WHEN status = 'MANUAL_REVIEW' THEN 'MANUAL_REVIEW' ELSE 'PENDING' END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [playerId, id]
  );
}

/**
 * Update deposit status, with an optional human-readable rejection reason.
 * @param {number} id
 * @param {string} status  e.g. 'APPROVED' | 'REJECTED'
 * @param {string|null} reason  Only stored when status is 'REJECTED'.
 */
function setStatus(id, status, reason = null) {
  const rejectionReason = status === 'REJECTED' ? (reason || null) : null;
  db.run(
    `UPDATE deposits
     SET status = ?,
         rejection_reason = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, rejectionReason, id]
  );
}

// ─────────────────────────────────────────────
// Soft delete (sets is_deleted = 1, never removes the row)
// ─────────────────────────────────────────────
function softDeleteDeposit(id) {
  db.run(
    `UPDATE deposits
     SET is_deleted = 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id]
  );
}

// ─────────────────────────────────────────────
// Pending / admin lists — exclude soft-deleted rows
// ─────────────────────────────────────────────
function getPendingDeposits(limit = 10) {
  return db.all(
    `SELECT * FROM deposits
     WHERE status IN ('PENDING', 'AI_REVIEW', 'MANUAL_REVIEW')
       AND COALESCE(is_deleted, 0) = 0
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
}

/**
 * Paginated transaction history for a user.
 * @param {string}  jid
 * @param {number}  limit   rows per page (default 10)
 * @param {number}  offset  rows to skip  (default 0)
 */
function getUserDeposits(jid, limit = 10, offset = 0) {
  return db.all(
    `SELECT id, bank_name, amount_text, status, rejection_reason, created_at
     FROM deposits
     WHERE user_jid = ?
       AND COALESCE(is_deleted, 0) = 0
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [jid, limit, offset]
  );
}

// ─────────────────────────────────────────────
// Reference duplicate checks
// Both functions normalise the input AND use a
// SQL expression so that un-normalised legacy rows
// also match correctly.
// ─────────────────────────────────────────────

/**
 * Find a deposit with a matching reference, optionally excluding a specific user.
 * Returns the first match or null.
 */
function findByReference(reference, excludeJid = null) {
  const norm = normalizeRef(reference);
  if (!norm) return null;

  if (excludeJid) {
    return db.get(
      `SELECT * FROM deposits
       WHERE LOWER(REPLACE(COALESCE(reference, ''), ' ', '')) = ?
         AND user_jid != ?
         AND COALESCE(is_deleted, 0) = 0
       LIMIT 1`,
      [norm, excludeJid]
    );
  }
  return db.get(
    `SELECT * FROM deposits
     WHERE LOWER(REPLACE(COALESCE(reference, ''), ' ', '')) = ?
       AND COALESCE(is_deleted, 0) = 0
     LIMIT 1`,
    [norm]
  );
}

/**
 * Check whether any deposit with this reference was submitted in the last 24 hours
 * (any user). Used to catch the same bank transaction re-submitted with a new image.
 */
function findByReferenceIn24h(reference) {
  const norm = normalizeRef(reference);
  if (!norm) return null;

  const cutoff = Math.floor((Date.now() - MS_24H) / 1000);
  return db.get(
    `SELECT * FROM deposits
     WHERE LOWER(REPLACE(COALESCE(reference, ''), ' ', '')) = ?
       AND created_at >= datetime(?, 'unixepoch')
       AND COALESCE(is_deleted, 0) = 0
     LIMIT 1`,
    [norm, cutoff]
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
  softDeleteDeposit,
  getPendingDeposits
};
