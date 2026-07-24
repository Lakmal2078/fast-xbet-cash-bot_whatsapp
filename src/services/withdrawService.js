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

module.exports = {
  createWithdrawal,
  getWithdrawal,
  getUserWithdrawals,
  setStatus,
  getPendingWithdrawals
};