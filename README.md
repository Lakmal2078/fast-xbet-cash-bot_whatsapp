# 🚀 Fast Xbet Official — WhatsApp AI Support Bot

> 1xBet පරිශීලකයන් සඳහා **Deposit, Withdrawal, Registration, Tips** සහ සම්පූර්ණ AI-powered support WhatsApp හරහා ලබාදෙන bot එකකි.  
> **Node.js + SQLite + Groq AI** භාවිතා කර Replit, Linux හෝ VPS ඕනෑම environment ෙල run කළ හැකිය.

---

## 📋 අන්තර්ගතය

1. [විශේෂාංග](#-විශේෂාංග)
2. [Prerequisites](#-prerequisites)
3. [Installation](#-installation)
4. [Environment Variables](#-environment-variables-env)
5. [Bot ආරම්භ කිරීම](#-bot-ආරම්භ-කිරීම)
6. [User Commands](#-user-commands)
7. [Admin Commands](#-admin-commands)
8. [ගොනු ව්‍යුහය](#-ගොනු-ව්‍යුහය)
9. [ආරක්ෂාව](#-ආරක්ෂාව)

---

## ✨ විශේෂාංග

### 💰 Core Services
| # | Feature | විස්තර |
|---|---------|--------|
| 1 | **Cash Deposit** | Bank accounts list කර, slip AI ෙල scan කර admin ට notify කරයි |
| 2 | **Cash Withdrawal** | 1xBet Cash method instructions + saved bank auto-fill |
| 3 | **Registration & Bonus** | Register link + promo code |
| 4 | **Daily Free Tips** | Telegram channel link |
| 5 | **Help Center** | සම්පූර්ණ usage guide |
| 6 | **Privacy Policy** | Data handling policy |
| 7 | **Admin Panel** | Admin-only stats and management |

### 🤖 AI Features
- **AI Slip Analysis** — Groq vision model ෙල deposit receipt OCR කර bank, amount, reference, date automatically extract කරයි
- **AI Chat** — Menu options ෙල ගොදුරු නොවෙන ඕනෑම message ෙකකට Groq LLM ෙල bot context-aware reply කරයි; Sinhala, English දෙකෙහිම respond කරයි

### 🧠 Smart Features
- **24h Welcome** — New user හෝ 24 පැය ගිය user ෙකකුට පමණක් welcome message; අනෙක් messages ෙල silent pass-through
- **Transaction History** — `history` command ෙලන් last 10 deposits + last 10 withdrawals status සමඟ
- **Saved Bank Details** — Withdrawal submit කළ විට bank details auto-save; ඊළඟ withdrawal ෙල pre-filled template show කරයි
- **Language Toggle** — Per-user Sinhala / English switch; DB ෙල persist වෙයි
- **Duplicate Detection**
  - *Image hash* — Same image file ෙකෙකෙකු submit කළොත් block කරයි
  - *Cross-user reference* — Different user ෙකෙකෙකු same transaction reference submit කළොත් admin ට 🚨 alert + MANUAL\_REVIEW flag කරයි
- **Rate Limiting** — Spam messages block කරයි
- **Auto Reconnect** — WhatsApp connection drop වුණොත් auto-reconnect
- **Admin Broadcast** — සියලු users ට notification message send කිරීම

---

## 🧰 Prerequisites

| අවශ්‍ය දේ | විස්තර |
|-----------|--------|
| **Node.js 18+** | නිර්දේශිත v20+ |
| **WhatsApp account** | Bot connect කිරීමට (QR scan හෝ pairing code) |
| **Groq API Key** | Vision + Chat AI සඳහා — නොමිලේ: [console.groq.com](https://console.groq.com) |

### Termux (Android) ෙල Node.js
```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts python make clang pkg-config
node -v
```
> `better-sqlite3` native build ෙලට `python`, `make`, `clang` අවශ්‍යයි.

---

## 📦 Installation

```bash
# 1. Project folder ෙට යන්න
cd fast-xbet-cash-bot

# 2. Dependencies install කරන්න
npm ci --omit=dev --registry=https://registry.npmjs.org

# 3. .env file සාදන්න
cp .env.example .env
nano .env   # GROQ_API_KEY සහ ADMIN_IDS set කරන්න
```

> **Termux quick setup:**
> ```bash
> bash termux-setup.sh
> nano .env
> npm start
> ```

---

## 🔑 Environment Variables (`.env`)

| Variable | Required | Default | විස්තර |
|----------|----------|---------|--------|
| `GROQ_API_KEY` | ✅ | — | Groq API key (vision + chat) |
| `ADMIN_IDS` | ✅ | — | Comma-separated phone numbers (country code, no `+`). E.g. `94771234567,94779876543` |
| `NODE_ENV` | | `development` | `production` recommended for live use |
| `PAIRING_PHONE_NUMBER` | | — | QR-less login: phone number (digits only). Leave blank to use QR scan |
| `SESSION_DIR` | | `./session` | WhatsApp session files folder |
| `DATABASE_FILE` | | `./data/bot.sqlite` | SQLite database path |
| `LOG_LEVEL` | | `info` | `debug` / `info` / `warn` / `error` |
| `GROQ_VISION_MODEL` | | `qwen/qwen3.6-27b` | Slip OCR model |
| `GROQ_CHAT_MODEL` | | `llama-3.1-8b-instant` | General AI chat model |
| `XBET_LINK` | | `https://1xbet.com` | Registration link |
| `XBET_PROMO_CODE` | | `VGSL` | Promo code shown to users |
| `CHANNEL_LINK` | | `https://t.me/fast_xbet_cash` | Telegram tips channel |
| `RATE_LIMIT_WINDOW_MS` | | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_MESSAGES` | | `20` | Max messages per window |
| `SELECT_BANK_TIMEOUT_MS` | | `120000` | Bank selection timeout |
| `AWAITING_SLIP_TIMEOUT_MS` | | `600000` | Slip / withdrawal await timeout |
| `AWAITING_ID_TIMEOUT_MS` | | `300000` | Player ID await timeout |
| `MIN_DEPOSIT_LKR` | | `100` | Minimum deposit amount |
| `MAX_DEPOSIT_LKR` | | `100000` | Maximum deposit amount |
| `MIN_WITHDRAW_LKR` | | `500` | Minimum withdrawal amount |
| `MAX_WITHDRAW_LKR` | | `500000` | Maximum withdrawal amount |

---

## ▶️ Bot ආරම්භ කිරීම

```bash
npm start
```

Bot start වූ විට terminal ෙල QR code එකක් හෝ pairing code link එකක් දිස් වේ.

**QR Scan:**
1. WhatsApp → Settings → Linked Devices → Link a Device
2. Terminal ෙල QR code scan කරන්න

**Pairing Code (QR නැතිව):**  
`.env` ෙල `PAIRING_PHONE_NUMBER=94771234567` ලෙස set කරන්න. Bot start වූ විට pairing code terminal ෙල print වේ; WhatsApp ෙල Linked Devices ෙල ඒ code enter කරන්න.

**Bot නවත්වන්න:**
```bash
Ctrl + C
```
> `shutdown()` function DB cleanly close කරයි.

---

## 💬 User Commands

| Command | විස්තර |
|---------|--------|
| `menu` | Main menu open කිරීම / active flow cancel කර menu ෙට |
| `1` | Cash Deposit — bank list show කරයි |
| `2` | Cash Withdrawal — instructions + saved bank (ඇත්නම්) |
| `3` | 1xBet Registration & Bonus |
| `4` | Daily Free Tips (Telegram link) |
| `5` | Help Center |
| `6` | Privacy Policy |
| `7` | Admin Panel (admin users only) |
| `cancel` | Active flow exit කිරීම |
| `history` | Last 10 deposits + last 10 withdrawals status සමඟ |
| `lang sinhala` / `lang si` | Bot language සිංහල ෙලට switch |
| `lang english` / `lang en` | Bot language English ෙලට switch |
| `.privacy get` | Current privacy preference බලන්න |
| `.privacy set standard` | Standard data retention |
| `.privacy set delete` | User data delete කිරීම |
| *(any other text)* | AI assistant automatically respond කරයි |

### 💰 Deposit Flow
1. `1` send කරන්න → bank list
2. Bank number send කරන්න → account details + instructions
3. Transfer කර slip photo (JPG/PNG) send කරන්න → AI scan
4. 1xBet Player ID enter කරන්න → admin notified

### 💸 Withdrawal Flow
1. `2` send කරන්න → instructions (saved bank ඇත්නම් pre-filled template)
2. Player ID, Amount, Secret Code, Bank Details text ෙලන් send කරන්න → admin notified
3. Bank details automatically saved for next time

---

## 👑 Admin Commands

Admin phone numbers `ADMIN_IDS` ෙල configured users ට පමණක් accessible.

### Stats & Listings
| Command | විස්තර |
|---------|--------|
| `/admin stats` | Total users, pending deposits, pending withdrawals |
| `/admin deposits` | Pending deposit list (last 10) |
| `/admin withdrawals` | Pending withdrawal list (last 10) |
| `/admin banks` | Active bank accounts list |

### Deposit Management
| Command | විස්තර |
|---------|--------|
| `/admin deposit approve <id>` | Deposit approve → user ට notification |
| `/admin deposit reject <id>` | Deposit reject → user ට notification |

### Withdrawal Management
| Command | විස්තර |
|---------|--------|
| `/admin withdraw approve <id>` | Withdrawal approve → user ට notification |
| `/admin withdraw reject <id>` | Withdrawal reject → user ට notification |

### Broadcast
| Command | විස්තර |
|---------|--------|
| `/admin broadcast <message>` | සියලු registered users ට message send (300ms delay per user) |

**Example:**
```
/admin broadcast 🎉 සීමිත කාලයක් සඳහා 150% bonus! Register කරන්න: https://1xbet.com
```

### Legacy WITHDRAW Command (staff/testing)
```
WITHDRAW <PlayerID> <Amount> <BankName> <AccNo> <AccountHolder>
```
Example: `WITHDRAW 123456 5000 BOC 95645895 Vgs Lakmal`

---

## 📁 ගොනු ව්‍යුහය

```
fast-xbet-cash-bot/
├── src/
│   ├── index.js                 # Entry point — bot init + shutdown
│   ├── bot/
│   │   ├── socket.js            # WhatsApp socket setup (Baileys)
│   │   └── messageRouter.js     # Incoming message routing
│   ├── handlers/
│   │   ├── textHandler.js       # Text message handler (all commands + AI fallback)
│   │   ├── imageHandler.js      # Image/slip handler + AI OCR + duplicate detection
│   │   ├── adminHandler.js      # Admin commands (stats, approve/reject, broadcast)
│   │   ├── withdrawHandler.js   # Legacy WITHDRAW command parser
│   │   └── privacyHandler.js    # .privacy commands
│   ├── services/
│   │   ├── aiService.js         # Groq vision (slip OCR) + chat AI
│   │   ├── adminService.js      # Admin helpers (isAdmin, stats, broadcast, notify)
│   │   ├── bankService.js       # Bank account CRUD
│   │   ├── depositService.js    # Deposit CRUD + duplicate checks
│   │   ├── withdrawService.js   # Withdrawal CRUD
│   │   └── userService.js       # User CRUD, language, saved bank, welcome tracking
│   ├── templates/
│   │   └── index.js             # All bot messages (bilingual SI/EN)
│   ├── db/
│   │   └── index.js             # SQLite init, migrations, state management
│   ├── middleware/
│   │   └── rateLimiter.js       # Per-user rate limiting
│   ├── config/
│   │   └── index.js             # Environment variable validation (Zod)
│   └── utils/
│       ├── helpers.js           # Validators, hash, bank text extractor, AI schema
│       └── logger.js            # Pino logger
├── .env.example                 # Environment variable template
├── .gitignore
├── package.json
├── termux-setup.sh              # Termux quick setup script
└── README.md
```

### Database Tables (SQLite)

| Table | විස්තර |
|-------|--------|
| `users` | jid, lang, privacy_pref, saved_bank (JSON), last_welcome_at |
| `bank_accounts` | Active bank accounts (seeded on first run) |
| `deposits` | All deposit requests with AI results and status |
| `withdrawals` | All withdrawal requests with status |
| `conversation_states` | Per-user flow state (expires automatically) |
| `admin_logs` | Admin action audit trail |

---

## 🔐 ආරක්ෂාව

- **`session/`** folder, **`.env`**, **`*.sqlite`** ගොනු කිසිවිටෙකත් GitHub ෙල commit නොකරන්න (`.gitignore` ෙල ඇතුළත් කර ඇත)
- `GROQ_API_KEY` code ෙල hardcode නොකරන්න — `.env` හරහා පමණක් load කරන්න
- `ADMIN_IDS` රහසිගතව තබන්න; admin ෙලට deposit/withdrawal approve/reject + broadcast access ඇත
- Cross-user duplicate slip detection ක්‍රියාකාරීව fraud flag කරයි — admin manually review කළ යුතුය
- Production deployment ෙල `NODE_ENV=production` set කරන්න

### නිර්දේශිත `.gitignore`
```gitignore
node_modules/
.env
session/
data/
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

---

## 🧩 Quick Reference — All Commands

```
# User
menu              → Main menu
1–7               → Service selection
cancel            → Exit current flow
history           → Transaction history
lang sinhala      → Switch to Sinhala
lang english      → Switch to English
.privacy get      → View privacy setting
.privacy set standard / delete

# Admin
/admin stats
/admin deposits
/admin deposit approve <id>
/admin deposit reject <id>
/admin withdrawals
/admin withdraw approve <id>
/admin withdraw reject <id>
/admin banks
/admin broadcast <message>
WITHDRAW <PlayerID> <Amount> <BankName> <AccNo> <AccountHolder>
```

---

## 📄 බලපත්‍රය

මෙම bot එක පෞද්ගලික / සේවා භාවිතය සඳහාය. Betting / මූල්‍ය සේවා ඔබගේ රටේ නීතිරීතිවලට අනුව සිදු කරගන්න.

---

*© 2026 Fast Xbet Official Sri Lanka. All rights reserved.*
