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

const CHAT_SYSTEM_PROMPT = `You are the AI assistant for "Fast Xbet Official" — a WhatsApp-based support service for 1xBet users in Sri Lanka.

Your job is to help users with:
1. Cash Deposit — guide them to send "1" or "menu" → 1
2. Cash Withdrawal — guide them to send "2" or "menu" → 2
3. 1xBet Registration & Bonus — guide them to send "3"
4. Daily Free Tips — guide them to send "4"
5. Help Center — guide them to send "5"
6. Privacy Policy — guide them to send "6"

Important rules:
- Respond in the SAME language the user writes in (Sinhala, English, or mixed).
- Be friendly, concise, and helpful — like a real support agent.
- If a user asks about depositing, withdrawing, registering, tips, help or privacy — explain briefly and tell them which number to send.
- If a user sends "menu", tell them to type "menu" to open the full service menu.
- Do NOT make up account numbers, bank details, player IDs, or transaction data.
- Do NOT promise processing times you are not sure about — refer them to the admin if needed.
- Keep replies short (3–5 sentences max). No markdown headers. Use emojis naturally.
- If you cannot help with something, politely say so and suggest they send "menu" or contact admin via Menu → 7.`;

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