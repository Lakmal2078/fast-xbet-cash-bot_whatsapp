const crypto = require('crypto');
const { z } = require('zod');

const PLAYER_ID_REGEX = /^\d{5,12}$/;

const BANK_KEYWORDS = [
  'bank of ceylon', 'boc', "people's bank", 'peoples bank',
  'sampath', 'dfcc', 'commercial bank', 'hnb', 'hatton national',
  'nations trust', 'nsb', 'seylan', 'lolc', 'ipay', 'dialog', 'mobitel',
  'frimi', 'fri mi', 'genie', 'ez cash', 'mcash', 'm cash'
];

function parsePhoneNumber(jid = '') {
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function isValidPlayerId(value) {
  return PLAYER_ID_REGEX.test(String(value || '').trim());
}

function normalizeAmount(rawAmount) {
  if (rawAmount === null || rawAmount === undefined) return null;
  const cleaned = String(rawAmount).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount)) return null;
  // Cap to 2 decimal places — monetary values must not carry floating-point
  // noise (e.g. "1000.555" from OCR must become 1000.56, not 1000.555).
  return Math.round(amount * 100) / 100;
}

function normalizeReference(ref) {
  if (!ref) return null;
  const s = String(ref).trim();
  return s.length >= 4 ? s : null;
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Mask a sensitive string (account number, phone) for safe logging.
 * Shows first 2 and last 2 characters; middle replaced with ****.
 * e.g. "95645895" → "95****95"
 */
function maskAccountNumber(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '****' + s.slice(-2);
}

/**
 * Truncate a long string for log output (e.g. raw_text from OCR).
 */
function truncateForLog(value, maxLen = 80) {
  if (!value) return null;
  const s = String(value);
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

const aiSlipSchema = z.object({
  is_payment_related: z.boolean().default(false),
  bank_name: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  date_time: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  sender: z.string().nullable().optional(),
  receiver: z.string().nullable().optional(),
  account_number: z.string().nullable().optional(),
  raw_text: z.string().nullable().optional()
});

function hasUsefulSlipData(ai) {
  if (!ai) return false;
  if (ai.is_payment_related === true) return true;
  if (normalizeAmount(ai.amount)) return true;
  if (ai.reference && String(ai.reference).trim().length >= 4) return true;
  if (ai.bank_name && String(ai.bank_name).toLowerCase() !== 'null') return true;
  return false;
}

function extractFromRawText(raw) {
  const text = String(raw || '');
  if (!text) return {};
  const out = {};

  // ── Amount extraction — extended for common Sri Lankan formats ───────────
  // Priority order (most specific → least specific):
  //  1. Currency prefix:  LKR 1,000.00 | Rs. 1,000/- | Rs 5000 | රු. 1000
  //  2. Amount + suffix:  1000 only | 1,000.50/- | 500/-
  //  3. Plain decimal:    1000.00 (fallback)
  const amt =
    // Currency-prefixed (LKR / Rs / රු / USD / EUR) with optional trailing /-
    text.match(/(?:LKR|Rs\.?|රු\.?|USD|EUR)\s*[\d][\d,]*(?:\.\d{1,2})?(?:\s*\/-)?/i) ||
    // Plain number followed by "only" or /- (e.g. "5,000 only", "1000/-")
    text.match(/\b[\d][\d,]*(?:\.\d{1,2})?\s*(?:only|\/-)(?=\s|$)/i) ||
    // Bare decimal (e.g. "1000.00")
    text.match(/\b[\d][\d,]*\.\d{2}\b/);

  if (amt) out.amount = amt[0].trim();

  // ── Reference extraction ──────────────────────────────────────────────────
  const ref = text.match(
    /(?:ref(?:erence)?|txn|transaction|receipt|confirmation|id)[^A-Za-z0-9]{0,3}([A-Za-z0-9]{6,})/i
  );
  if (ref) out.reference = ref[1];

  // ── Bank name extraction ──────────────────────────────────────────────────
  const lower = text.toLowerCase();
  const bank = BANK_KEYWORDS.find((k) => lower.includes(k));
  if (bank) out.bank_name = bank;

  return out;
}

const withdrawSchema = z.object({
  playerId: z.string().regex(PLAYER_ID_REGEX, 'Invalid Player ID'),
  amountRaw: z.string().min(1),
  bankName: z.string().min(2).max(60),
  accountNumber: z.string().regex(/^\d{5,20}$/, 'Invalid account number'),
  accountHolder: z.string().min(3).max(100)
});

/**
 * Try to extract bank details from a free-form withdrawal text block.
 * Returns { bank_name, account_holder, account_number, branch } or null.
 */
function extractBankFromText(text) {
  if (!text) return null;
  const get = (pattern) => {
    const m = text.match(pattern);
    return m ? m[1].trim().replace(/\s+/g, ' ') : null;
  };
  const result = {
    bank_name: get(/bank\s*name\s*[:\-•*]\s*(.+)/i),
    account_holder: get(/account\s*holder\s*[:\-•*]\s*(.+)/i),
    account_number: get(/account\s*(?:number|no\.?)\s*[:\-•*]\s*([\w\s]+)/i),
    branch: get(/branch\s*[:\-•*]\s*(.+)/i)
  };
  if (result.bank_name && result.account_number) return result;
  return null;
}

module.exports = {
  PLAYER_ID_REGEX,
  parsePhoneNumber,
  isValidPlayerId,
  normalizeAmount,
  normalizeReference,
  sha256Buffer,
  maskAccountNumber,
  truncateForLog,
  aiSlipSchema,
  hasUsefulSlipData,
  extractFromRawText,
  extractBankFromText,
  withdrawSchema
};
