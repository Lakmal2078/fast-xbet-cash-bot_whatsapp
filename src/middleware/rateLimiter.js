const config = require('../config');

const store = new Map();

function isRateLimited(jid) {
  const now = Date.now();
  const entry = store.get(jid);

  if (!entry || now > entry.resetAt) {
    store.set(jid, {
      count: 1,
      resetAt: now + config.RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  if (entry.count >= config.RATE_LIMIT_MAX_MESSAGES) {
    return true;
  }

  entry.count += 1;
  return false;
}

setInterval(() => {
  const now = Date.now();

  for (const [jid, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(jid);
    }
  }
}, 2 * 60 * 1000).unref();

module.exports = {
  isRateLimited
};
