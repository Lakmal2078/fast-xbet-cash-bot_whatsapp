const Groq = require('groq-sdk');

const config = require('../config');
const logger = require('../utils/logger');
const {
  aiSlipSchema,
  extractFromRawText,
  normalizeReference,
  maskAccountNumber,
  truncateForLog
} = require('../utils/helpers');

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

const EMPTY = {
  is_payment_related: false,
  bank_name: null,
  amount: null,
  currency: null,
  date_time: null,
  reference: null,
  sender: null,
  receiver: null,
  account_number: null,
  raw_text: null
};

// ═══════════════════════════════════════════════════════════
// VISION PROMPT — Sri Lankan app/bank UI patterns included
// ═══════════════════════════════════════════════════════════
const VISION_PROMPT = `You are a payment-receipt OCR assistant specialised in Sri Lankan banking and mobile payment apps.
The image may be a photo, a SCREENSHOT, a cropped image, or a photo of a screen.
NEVER reject an image because it is a screenshot, has black borders, or is slightly blurry.
Read EVERYTHING visible and extract payment / transfer details.

Sri Lankan apps and banks to recognise by their UI patterns:
- FriMi (Dialog Finance) — blue/green gradient, "FriMi" logo, shows "Transaction Successful", reference starts with "FRM"
- Genie (HNB) — orange theme, "Genie" logo, reference starts with "GEN" or shows "Transfer Successful"
- eZ Cash (Mobitel) — red/white theme, "eZ Cash" branding, "Transaction ID" field
- mCash (Dialog) — teal/blue theme, "mCash" branding
- Bank of Ceylon (BOC) — BOC logo, green/gold colors, shows "BOC Internet Banking" or "BOC Mobile"
- Sampath Bank — Sampath Vishwa app, blue header, "Transaction Reference" or "TXN"
- Commercial Bank — ComBank app, red theme, "Transaction Successful", "Reference No"
- People's Bank — People's Wave app, red/white, "Transfer Confirmation"
- Seylan Bank — blue wave logo, "Seylan Online Banking"
- Nations Trust Bank (NTB) — FriMi partner, "American Express" co-brand
- DFCC — DFCC Virtual Wallet, purple/blue theme
- LOLC Finance — LOLC branding, orange theme
- iPay — yellow/orange theme, "iPay" logo

Rules:
- is_payment_related = true if the image contains ANY bank, payment, transfer, deposit, receipt, transaction, balance, reference number, or money text. false ONLY for totally unrelated images.
- Extract every field you can see. If not visible, use null. NEVER invent values.
- Copy numbers, names and references EXACTLY as shown.
- Put ALL readable text verbatim into raw_text.

Return STRICT JSON only:
{
  "is_payment_related": true,
  "bank_name": "bank or app name or null",
  "amount": "amount exactly as shown e.g. LKR 1,000.00 or null",
  "currency": "LKR/USD/etc or null",
  "date_time": "date and/or time as shown or null",
  "reference": "transaction reference / receipt no / txn ref or null",
  "sender": "sender / From name or null",
  "receiver": "receiver / To name or null",
  "account_number": "account number or null",
  "raw_text": "all visible text verbatim"
}`;

// ═══════════════════════════════════════════════════════════
// FRUSTRATION KEYWORDS — bilingual (Sinhala + English)
// ═══════════════════════════════════════════════════════════
const FRUSTRATION_KEYWORDS = [
  // English
  'scam', 'fraud', 'cheat', 'cheating', 'fake', 'lie', 'liar', 'thief', 'theft',
  'stolen', 'robbery', 'not received', 'never got', 'money missing', 'missing money',
  'still waiting', 'no response', 'useless', 'terrible', 'disgusting', 'pathetic',
  'complaint', 'report', 'police', 'sue', 'legal',
  // Sinhala unicode
  'රවටා', 'රවටනවා', 'කොල්ල', 'ගත්තා', 'ගන්නවා', 'ආවේ නැහැ', 'ගිහිල්ල',
  'ආවේ නෑ', 'නෑ ආවේ', 'නෑ ගිය', 'වංචා', 'මාරු', 'හොරකම', 'නඩු',
  // Sinhala romanized (common in Sri Lankan WhatsApp)
  'ravata', 'kolla', 'wancha', 'hora', 'nadu', 'police'
];

// ═══════════════════════════════════════════════════════════
// FALLBACK REPLY — shown when Groq API is completely down
// ═══════════════════════════════════════════════════════════
const FALLBACK_REPLY_SI = `🙏 දැනට AI සේවාව තාවකාලිකව නොලැබේ. කරුණාකර "menu" ලෙස ටයිප් කර ප්‍රධාන menu ලබාගන්න, හෝ "7" ලෙස ටයිප් කර admin සමඟ සෘජුවම කතා කරන්න.`;
const FALLBACK_REPLY_EN = `🙏 AI service is temporarily unavailable. Please type "menu" to open the main menu, or "7" to contact an admin directly.`;

// ═══════════════════════════════════════════════════════════
// CHAT SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════
const CHAT_SYSTEM_PROMPT = `You are "XBot", the AI support assistant for "Fast Xbet Official" — a trusted WhatsApp-based cash deposit and withdrawal service for 1xBet users in Sri Lanka.

━━━ WHO YOU ARE ━━━
You are a friendly, professional Sri Lankan support agent. You know 1xBet well. You speak Sinhala, English, and Singlish naturally — always match the user's language exactly. You are calm, patient, and never rude even if the user is frustrated.

━━━ WHAT YOU CAN HELP WITH ━━━
Menu options users can access by typing the number:
  1 → Cash Deposit (send bank slip)
  2 → Cash Withdrawal (request payout)
  3 → 1xBet Registration & Welcome Bonus
  4 → Daily Free Betting Tips
  5 → Help Center / FAQ
  6 → Privacy Policy
  7 → Contact Admin directly

Other commands:
  "menu"    → opens the main menu
  "history" → shows their last transactions
  "guide"   → opens the user guide
  "lang sinhala" / "lang english" → switch language

━━━ HOW TO RESPOND ━━━
- Keep replies SHORT — 2 to 4 sentences max. No essays.
- No markdown (no **, no #, no bullet lists with -). Use plain text and emojis naturally 😊
- If someone asks how to deposit → briefly explain and say "send 1 to start"
- If someone asks about withdrawal → briefly explain and say "send 2 to start"
- If someone is angry or frustrated → stay calm, acknowledge their problem, guide them to admin (option 7)
- If you don't know something → honestly say so and offer "menu" or "contact admin via 7"
- Never guess transaction status, amounts, or processing times — say "our team will confirm shortly"
- Use the conversation history to understand context — short replies like "yes", "no", "ok" refer to what was just discussed.

━━━ STRICT RULES — NEVER BREAK THESE ━━━
❌ Never invent account numbers, bank details, player IDs, or transaction references
❌ Never promise a specific processing time (e.g. "your money in 5 minutes")
❌ Never discuss competitors or other betting platforms
❌ Never give betting strategy advice or guarantee wins
❌ Never ask for passwords or PINs
❌ Never say you are ChatGPT, Claude, Gemini, or any other AI — you are XBot
❌ Never share or confirm other users' information

━━━ TONE EXAMPLES ━━━
User frustrated: "ම money ගිහිල්ලා කොහේද" →
"ඔයාගේ transaction team එකෙන් check කරනවා 🙏 Admin කෙනෙකු සමඟ directly කතා කරන්න "7" send කරන්න."

User confused: "how do i put money" →
"Easy! Just send 1️⃣ and follow the steps — you'll pick your bank and send a slip photo. Takes about 2 minutes 😊"

User asking status: "my deposit pending" →
"Pending deposits are reviewed by our team soon 🙏 If it's been a while, send 7 to reach admin directly."`;


// ─────────────────────────────────────────────
// Retry wrapper
// ─────────────────────────────────────────────
async function withRetry(fn, retries = 2) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────
// Image quality pre-check (before calling AI)
// Returns { ok: true } or { ok: false, reason }
// ─────────────────────────────────────────────
function checkImageQuality(buffer) {
  if (!buffer || buffer.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  // Validate image format by magic bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    return { ok: false, reason: 'unsupported_format' };
  }

  // Very small images (<3 KB) are almost certainly blank, solid-colour, or corrupted
  if (buffer.length < 3 * 1024) {
    return { ok: false, reason: 'too_small' };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// Frustration detector (rule-based, fast)
// ─────────────────────────────────────────────
function detectFrustration(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FRUSTRATION_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

// ─────────────────────────────────────────────
// Slip image analysis
// ─────────────────────────────────────────────
async function analyzeSlipImage(base64Image) {
  try {
    const response = await withRetry(() =>
      groq.chat.completions.create({
        model: config.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    );

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const validated = aiSlipSchema.safeParse(parsed);
    const ai = validated.success ? { ...EMPTY, ...validated.data } : { ...EMPTY };

    const fallback = extractFromRawText(ai.raw_text);
    if (!ai.amount && fallback.amount) ai.amount = fallback.amount;
    if (!ai.reference && fallback.reference) ai.reference = fallback.reference;
    if ((!ai.bank_name || ai.bank_name === 'null') && fallback.bank_name) ai.bank_name = fallback.bank_name;
    if (!ai.is_payment_related && (ai.amount || ai.reference || ai.bank_name)) ai.is_payment_related = true;
    ai.reference = normalizeReference(ai.reference);

    // Log with sensitive data masked
    logger.info(
      {
        related: ai.is_payment_related,
        bank: ai.bank_name,
        amount: ai.amount,
        ref: ai.reference,
        account: maskAccountNumber(ai.account_number),
        raw_preview: truncateForLog(ai.raw_text, 60)
      },
      'Slip analysis result'
    );
    return ai;
  } catch (error) {
    logger.warn({ err: error.message, status: error.status }, 'AI slip analysis failed (continuing as manual review)');
    return { ...EMPTY };
  }
}

// ─────────────────────────────────────────────
// Chat AI — supports conversation history
// ─────────────────────────────────────────────
async function chatWithAI(userMessage, conversationHistory = [], lang = 'si') {
  try {
    // Build messages array with up to 3 prior exchanges (6 messages)
    const historySlice = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-6)
      : [];

    const messages = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...historySlice,
      { role: 'user', content: userMessage }
    ];

    const response = await withRetry(() =>
      groq.chat.completions.create({
        model: config.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant',
        messages,
        temperature: 0.6,
        max_tokens: 300
      })
    );

    const reply = response.choices[0]?.message?.content?.trim();
    return reply || null;
  } catch (error) {
    logger.warn({ err: error.message }, 'Chat AI failed — returning hardcoded fallback');
    // Return a hardcoded fallback instead of null so the bot never goes silent
    return lang === 'en' ? FALLBACK_REPLY_EN : FALLBACK_REPLY_SI;
  }
}

module.exports = {
  analyzeSlipImage,
  chatWithAI,
  checkImageQuality,
  detectFrustration
};
