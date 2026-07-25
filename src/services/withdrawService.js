const db = require('../db');

function createWithdrawal({
  userJid,
  playerId,
  amount,
  amountText,
  bankName,
  accountNumber,
  accountHolder
}) {
  const result = db.run(
    `
    INSERT INTO withdrawals (
      user_jid,
      player_id,
      amount,
      amount_text,
      bank_name,
      account_number,
      account_holder,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [
      userJid,
      playerId,
      amount,
      amountText,
      bankName,
      accountNumber,
      accountHolder
    ]
  );

  return Number(result.lastInsertRowid);
}

function getWithdrawal(id) {
  return db.get('SELECT * FROM withdrawals WHERE id = ?', [id]);
}

function setStatus(id, status) {
  db.run(
    `
    UPDATE withdrawals
    SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [status, id]
  );
}

function getPendingWithdrawals(limit = 10) {
  return db.all(
    `
    SELECT *
    FROM withdrawals
    WHERE status = 'PENDING'
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [limit]
  );
}

function getUserWithdrawals(jid, limit = 10) {
  return db.all(
    `SELECT id, amount_text, bank_name, status, created_at
     FROM withdrawals WHERE user_jid = ?
     ORDER BY created_at DESC LIMIT ?`,
    [jid, limit]
  );
}

/**
 * Allow a user to cancel their own PENDING withdrawal.
 * Returns true if cancelled, false if already processed or not found.
 */
function cancelWithdrawal(id, userJid) {
  const result = db.run(
    `UPDATE withdrawals
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_jid = ? AND status = 'PENDING'`,
    [id, userJid]
  );
  return result.changes > 0;
}

/**
 * Set rejection reason when admin rejects a withdrawal.
 */
function setRejectionReason(id, reason) {
  db.run(
    `UPDATE withdrawals
     SET status = 'REJECTED', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [reason, id]
  );
}

/**
 * Record payout reference and mark withdrawal as COMPLETED after admin pays out.
 */
function updatePayoutDetails(id, payoutReference, paidByAdmin) {
  db.run(
    `UPDATE withdrawals
     SET status = 'COMPLETED', payout_reference = ?, paid_at = CURRENT_TIMESTAMP,
         processed_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [payoutReference, paidByAdmin, id]
  );
}

module.exports = {
  createWithdrawal,
  getWithdrawal,
  getUserWithdrawals,
  setStatus,
  getPendingWithdrawals,
  cancelWithdrawal,
  setRejectionReason,
  updatePayoutDetails
};