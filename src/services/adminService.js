const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');
const { parsePhoneNumber } = require('../utils/helpers');

/**
 * Returns true when jid belongs to a configured admin.
 * Explicit validation: if parsePhoneNumber returns an empty string
 * (e.g. jid is null / malformed) we short-circuit to false rather
 * than letting an empty string match accidentally.
 */
function isAdmin(jid) {
  const phone = parsePhoneNumber(jid ?? '');
  if (!phone) return false;
  return config.ADMIN_IDS.includes(phone);
}

/**
 * Appends an entry to admin_logs.
 * Failures are logged as warnings — a missed audit row must never
 * crash the bot.
 */
function logAction(adminJid, action, target = '', details = '') {
  try {
    db.run(
      `INSERT INTO admin_logs (admin_jid, action, target, details)
       VALUES (?, ?, ?, ?)`,
      [adminJid, action, String(target), String(details)]
    );
  } catch (err) {
    logger.warn({ err: err.message, adminJid, action }, 'adminService.logAction failed');
  }
}

/**
 * Returns aggregate counts for the admin stats panel.
 * Each query is guarded individually so one broken table never
 * prevents the other counts from being returned.
 */
function getStats() {
  let users = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;

  try {
    users = db.get('SELECT COUNT(*) AS count FROM users')?.count ?? 0;
  } catch (err) {
    logger.error({ err: err.message }, 'adminService.getStats: users count failed');
  }

  try {
    pendingDeposits =
      db.get(
        `SELECT COUNT(*) AS count FROM deposits
         WHERE status IN ('PENDING', 'AI_REVIEW', 'MANUAL_REVIEW')`
      )?.count ?? 0;
  } catch (err) {
    logger.error({ err: err.message }, 'adminService.getStats: deposits count failed');
  }

  try {
    pendingWithdrawals =
      db.get(
        `SELECT COUNT(*) AS count FROM withdrawals WHERE status = 'PENDING'`
      )?.count ?? 0;
  } catch (err) {
    logger.error({ err: err.message }, 'adminService.getStats: withdrawals count failed');
  }

  return { users, pendingDeposits, pendingWithdrawals };
}

/**
 * Returns an array of every user JID in the DB.
 * Returns an empty array on DB failure so broadcast callers
 * receive a safe iterable.
 */
function getAllUserJids() {
  try {
    return db.all('SELECT jid FROM users').map((r) => r.jid);
  } catch (err) {
    logger.error({ err: err.message }, 'adminService.getAllUserJids failed');
    return [];
  }
}

/**
 * Sends a text message to every configured admin.
 * Uses Promise.allSettled so one failed delivery never blocks others.
 */
async function notifyAdmins(sock, text) {
  await Promise.allSettled(
    config.ADMIN_IDS.map((adminId) =>
      sock.sendMessage(`${adminId}@s.whatsapp.net`, { text })
    )
  );
}

module.exports = {
  isAdmin,
  logAction,
  getStats,
  getAllUserJids,
  notifyAdmins
};
