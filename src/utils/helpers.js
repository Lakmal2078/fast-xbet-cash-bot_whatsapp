const crypto = require('crypto');
const { z } = require('zod');

const PLAYER_ID_REGEX = /^\d{5,12}$/;

const BANK_KEYWORDS = [
  'bank of ceylon', 'boc', "people's bank", 'peoples bank',
  'sampath', 'dfcc', 'commercial bank', 'hnb', 'hatton national',
  'nations trust', 'nsb', 'seylan', 'lolc', 'ipay', 'dialog', 'mobitel'
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
  return Number.isFinite(amount) ? amount : null;
}

function normalizeReference(ref) {
  if (!ref) return null;
  const s = String(ref).trim();
  return s.length >= 4 ? s : null;
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
  const amt =
    text.match(/(?:LKR|Rs\.?|USD|EUR)\s?[\d][\d,]*(?:\.\d{1,2})?/i) ||
    text.match(/\b[\d][\d,]*\.\d{2}\b/);
  if (amt) out.amount = amt[0];
  const ref = text.match(
    /(?:ref(?:erence)?|txn|transaction|receipt|confirmation|id)[^A-Za-z0-9]{0,3}([A-Za-z0-9]{6,})/i
  );
  if (ref) out.reference = ref[1];
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

module.exports = {
  PLAYER_ID_REGEX,
  parsePhoneNumber,
  isValidPlayerId,
  normalizeAmount,
  normalizeReference,
  sha256Buffer,
  aiSlipSchema,
  hasUsefulSlipData,
  extractFromRawText,
  withdrawSchema
};