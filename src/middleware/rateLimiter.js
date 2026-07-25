const config = require('../config');

const store = new Map();

/**
 * Check whether jid is rate-limited.
 *
 * Returns:
 *   false    — not limited, message may proceed
 *   'warn'   — just crossed the limit for the first time this window
 *              → send the warning message once, then drop
 *   'silent' — already warned in this window → drop silently (no reply spam)
 */
function isRateLimited(jid) {
  const now = Date.now();
  const entry = store.get(jid);

  // New window — reset counter
  if (!entry || now > entry.resetAt) {
    store.set(jid, {
      count: 1,
      resetAt: now + config.RATE_LIMIT_WINDOW_MS,
      warned: false
    });
    return false;
  }

  if (entry.count >= config.RATE_LIMIT_MAX_MESSAGES) {
    if (!entry.warned) {
      entry.warned = true;
      return 'warn'; // first breach — caller should send warning once
    }
    return 'silent'; // subsequent breaches — caller should drop silently
  }

  entry.count += 1;
  return false;
}

// Purge expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jid, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(jid);
  }
}, 2 * 60 * 1000).unref();

module.exports = { isRateLimited };
