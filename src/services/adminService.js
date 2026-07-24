const config = require('../config');
const db = require('../db');
const { parsePhoneNumber } = require('../utils/helpers');

function isAdmin(jid) {
  const phone = parsePhoneNumber(jid);
  return config.ADMIN_IDS.includes(phone);
}

function logAction(adminJid, action, target = '', details = '') {
  db.run(
    `
    INSERT INTO admin_logs (admin_jid, action, target, details)
    VALUES (?, ?, ?, ?)
    `,
    [adminJid, action, target, details]
  );
}

function getStats() {
  const users = db.get('SELECT COUNT(*) AS count FROM users').count;

  const pendingDeposits = db.get(
    `
    SELECT COUNT(*) AS count
    FROM deposits
    WHERE status IN ('PENDING', 'AI_REVIEW', 'MANUAL_REVIEW')
    `
  ).count;

  const pendingWithdrawals = db.get(
    `
    SELECT COUNT(*) AS count
    FROM withdrawals
    WHERE status = 'PENDING'
    `
  ).count;

  return {
    users,
    pendingDeposits,
    pendingWithdrawals
  };
}

async function notifyAdmins(sock, text) {
  await Promise.allSettled(
    config.ADMIN_IDS.map(async (adminId) => {
      const jid = `${adminId}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text });
    })
  );
}

module.exports = {
  isAdmin,
  logAction,
  getStats,
  notifyAdmins
};