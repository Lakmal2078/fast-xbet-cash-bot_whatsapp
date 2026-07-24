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

module.exports = { analyzeSlipImage };