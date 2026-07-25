const pino = require('pino');
const config = require('../config');

// ── Sensitive field paths to redact from ALL log output ──────────────────────
// This is a safety-net on top of the manual masking already done in aiService
// and imageHandler. If any caller accidentally logs a raw object that contains
// these keys, pino will replace the value with '[REDACTED]' before writing.
//
// Uses pino's built-in redact feature — zero performance cost when the path
// is not present in a given log record.
const REDACT_PATHS = [
  // Top-level keys that may appear directly in log objects
  'account_number',
  'account',
  'raw_text',
  'caption',
  'password',
  'token',
  'secret',
  // Nested inside arbitrary wrapper objects
  '*.account_number',
  '*.account',
  '*.raw_text',
  '*.caption',
  '*.password',
  '*.token',
  '*.secret',
  // HTTP request fields (if a web layer is added later)
  'req.headers.authorization',
  'req.headers.cookie'
];

const logger = pino({
  level: config.LOG_LEVEL || 'info',   // safe fallback if env var missing
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]'
  }
});

// ── Log rotation note ─────────────────────────────────────────────────────────
// pino writes to stdout only. In production, wire stdout to a rotating log
// manager to avoid disk exhaustion:
//
//   PM2        →  pm2 start src/index.js --log-date-format "YYYY-MM-DD"
//                 + /etc/logrotate.d entry for ~/.pm2/logs/
//   Docker     →  use the json-file driver with max-size / max-file options:
//                 --log-driver json-file --log-opt max-size=10m --log-opt max-file=5
//   systemd    →  journald handles rotation automatically (journalctl -u yourservice)
//   in-process →  npm install pino-roll  and pipe:  node src/index.js | pino-roll app.log
//
// Do NOT log sensitive data at DEBUG level in production — set LOG_LEVEL=warn.

module.exports = logger;
