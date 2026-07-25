const db = require('../db');
const logger = require('../utils/logger');

// ─── In-memory cache ─────────────────────────────────────────────────────────
// Bank accounts change very rarely; cache them for 5 minutes to avoid
// hitting the DB on every deposit menu open.
const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache = null;        // { banks: [...], expiresAt: number }

function _invalidateCache() {
  _cache = null;
}

// Explicit columns — avoids pulling internal fields and keeps the payload small.
const BANK_COLUMNS = `id, sort_key, bank_name, account_holder, account_number,
  display_number, branch, is_active, created_at`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return all active banks, served from cache when fresh.
 */
function getActiveBanks() {
  try {
    if (_cache && Date.now() < _cache.expiresAt) {
      return _cache.banks;
    }

    const banks = db.all(
      `SELECT ${BANK_COLUMNS} FROM bank_accounts WHERE is_active = 1 ORDER BY sort_key ASC`
    );

    _cache = { banks, expiresAt: Date.now() + CACHE_TTL_MS };
    return banks;
  } catch (err) {
    logger.error({ err: err.message }, 'bankService.getActiveBanks failed');
    // Return cached data if available (stale-on-error), otherwise empty list.
    return _cache?.banks ?? [];
  }
}

/**
 * Look up a single active bank by its menu sort key.
 * Returns null when sortKey is invalid or no matching bank is found.
 */
function getBankBySort(sortKey) {
  // Input validation — reject null / undefined / non-numeric values up-front.
  const key = Number(sortKey);
  if (!sortKey || Number.isNaN(key) || key <= 0) return null;

  try {
    return db.get(
      `SELECT ${BANK_COLUMNS} FROM bank_accounts WHERE is_active = 1 AND sort_key = ?`,
      [key]
    ) ?? null;
  } catch (err) {
    logger.error({ err: err.message, sortKey }, 'bankService.getBankBySort failed');
    return null;
  }
}

/**
 * Bust the cache — call this after any admin operation that modifies bank_accounts.
 */
function invalidateBankCache() {
  _invalidateCache();
}

module.exports = {
  getActiveBanks,
  getBankBySort,
  invalidateBankCache
};
