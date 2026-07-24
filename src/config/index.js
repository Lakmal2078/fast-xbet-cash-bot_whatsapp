require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  SESSION_DIR: z.string().default('./session'),
  DATABASE_FILE: z.string().default('./data/bot.sqlite'),

  GROQ_API_KEY: z.string().min(10, 'GROQ_API_KEY is required'),

  ADMIN_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),

  XBET_LINK: z.string().url().default('https://1xbet.com'),
  XBET_PROMO_CODE: z.string().default('VGSL'),
  CHANNEL_LINK: z.string().url().default('https://t.me/fast_xbet_cash'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_MESSAGES: z.coerce.number().int().positive().default(20),

  SELECT_BANK_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AWAITING_SLIP_TIMEOUT_MS: z.coerce.number().int().positive().default(600000),
  AWAITING_ID_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),

  MIN_DEPOSIT_LKR: z.coerce.number().positive().default(100),
  MAX_DEPOSIT_LKR: z.coerce.number().positive().default(100000),

  MIN_WITHDRAW_LKR: z.coerce.number().positive().default(500),
  MAX_WITHDRAW_LKR: z.coerce.number().positive().default(500000),

  LOG_LEVEL: z.string().default('info'),

  GROQ_VISION_MODEL: z.string().default('qwen/qwen3.6-27b'),
  GROQ_CHAT_MODEL: z.string().default('llama-3.1-8b-instant'),

  PAIRING_PHONE_NUMBER: z
    .string()
    .regex(/^\d{7,15}$/, 'PAIRING_PHONE_NUMBER must be digits only (with country code, no +)')
    .optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;