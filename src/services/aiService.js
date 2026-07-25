const Groq = require('groq-sdk');

const config = require('../config');
const logger = require('../utils/logger');
const {
  aiSlipSchema,
  extractFromRawText,
  normalizeReference
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

const VISION_PROMPT = `You are a payment-receipt OCR assistant.
The image may be a photo, a SCREENSHOT, a cropped image, or a photo of a screen.
NEVER reject an image because it is a screenshot, has black borders, or is slightly blurry.
Read EVERYTHING visible and extract payment / transfer details.

Rules:
- is_payment_related = true if the image contains ANY bank, payment, transfer, deposit, receipt, transaction, balance, reference number, or money text. false ONLY for totally unrelated images.
- Extract every field you can see. If not visible, use null. NEVER invent values.
- Copy numbers, names and references EXACTLY as shown.
- Put ALL readable text verbatim into raw_text.

Return STRICT JSON only:
{
  "is_payment_related": true,
  "bank_name": "bank name or null",
  "amount": "amount exactly as shown e.g. LKR 1,000.00 or null",
  "currency": "LKR/USD/etc or null",
  "date_time": "date and/or time as shown or null",
  "reference": "transaction reference / receipt no / txn ref or null",
  "sender": "sender / From name or null",
  "receiver": "receiver / To name or null",
  "account_number": "account number or null",
  "raw_text": "all visible text verbatim"
}`;

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

    logger.info({ related: ai.is_payment_related, bank: ai.bank_name, amount: ai.amount, ref: ai.reference }, 'Slip analysis result');
    return ai;
  } catch (error) {
    // AI fail වුණත් crash නෑ — empty result return
    logger.warn({ err: error.message, status: error.status }, 'AI slip analysis failed (continuing as manual review)');
    return { ...EMPTY };
  }
}

// ═══════════════════════════════════════════
// CHAT AI — general message handler
// ═══════════════════════════════════════════

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


async function chatWithAI(userMessage) {
  try {
    const response = await withRetry(() =>
      groq.chat.completions.create({
        model: config.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 300
      })
    );

    const reply = response.choices[0]?.message?.content?.trim();
    return reply || null;
  } catch (error) {
    logger.warn({ err: error.message }, 'Chat AI failed');
    return null;
  }
}

module.exports = { analyzeSlipImage, chatWithAI };