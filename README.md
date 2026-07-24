```markdown
#  Fast 1xBet Cash Bot — WhatsApp Bot

> 1xBet පරිශීලකයන් සඳහා **Deposit, Withdrawal, Registration, Tips** සහ අනෙකුත් සේවා WhatsApp හරහා ස්වයංක්‍රීයව ලබාදෙන AI සහායක Bot එකකි.
> මෙය **Termux / Linux / VPS** වැනි පරිසරයක **SQLite** database එකක් සමඟ ධාවනය කිරීමට සකසා ඇත.

මෙම README ගොනුව ඔබගේ **`index.js`** (එකම ගොනුවේ ඇති version එක) සඳහා සකස් කර ඇත.

---

## 📋 අන්තර්ගතය

1. [විශේෂාංග](#-විශේෂාංග)
2. [අවශ්‍ය දේවල් (Prerequisites)](#-අවශ්‍ය-දේවල්-prerequisites)
3. [ස්ථාපනය (Installation)](#-ස්ථාපනය-installation)
4. [Config ගොනුව සැකසීම](#-config-ගොනුව-සැකසීම)
5. [Environment Variables (.env)](#-environment-variables-env)
6. [Bot එක ආරම්භ කිරීම + QR Scan](#-bot-එක-ආරම්භ-කිරීම--qr-scan)
7. [Bot එක ක්‍රියා කරන ආකාරය](#-bot-එක-ක්‍රියා-කරන-ආකාරය)
8. [ගොනු ව්‍යුහය](#-ගොනු-ව්‍යුහය)
9. [යමක් වෙනස් කරගන්න ආකාරය](#-යමක්-වෙනස්-කරගන්න-ආකාරය)
10. [වැදගත් සටහන් / Troubleshooting](#-වැදගත්-සටහන්--troubleshooting)
11. [ආරක්ෂාව](#-ආරක්ෂාව)

---

## ✨ විශේෂාංග

- 💰 **Cash Deposit** — බැංකු ගිණුම් විස්තර පෙන්වා, slip photo එක AI මඟින් පරීක්ෂා කරයි
- 💸 **Cash Withdrawal** — 1xBet Cash method උපදෙස් ලබාදෙයි
- 📋 **Registration & Bonus** — register link + promo code
- ⚽ **Daily Tips** — Telegram channel link
- 🆘 **Help Center** සහ 🔒 **Privacy Policy**
- 👑 **Admin Panel** — admin පරිශීලකයන්ට user count බැලීමට
- 🤖 **AI Slip Analysis** — Groq vision model එකෙන් receipt කියවයි
- ⏱️ **Rate Limiting** — spam වැළැක්වීම
- 🗄️ **SQLite** — පරිශීලකයන් database එකේ save වේ
- 🔁 **Auto Reconnect** — connection බිඳුණොත් නැවත සම්බන්ධ වේ

---

## 🧰 අවශ්‍ය දේවල් (Prerequisites)

| අවශ්‍ය දේ | විස්තර |
|-----------|--------|
| **Node.js** | version 18+ (නිර්දේශිත 20+) |
| **WhatsApp ගිණුමක්** | bot එක සම්බන්ධ කිරීමට |
| **Groq API Key** | AI slip analysis සඳහා (නොමිලේ — [console.groq.com](https://console.groq.com)) |
| **Internet connection** | WhatsApp + Groq server වලට සම්බන්ධ වීමට |

### Termux එකේ Node.js ස්ථාපනය

```bash
pkg update && pkg upgrade
pkg install nodejs
node -v
```

---

## 📦 ස්ථාපනය (Installation)

### 1. Project folder එකට යන්න

```bash
cd my_project/fast-xbet-cash-bot
```

### 2. Dependencies ස්ථාපනය කරන්න

`package.json` ගොනුවක් නැත්නම්, පහත command එකෙන් අවශ්‍ය packages install කරන්න:

```bash
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal groq-sdk better-sqlite3
```

> 📌 `index.js` එක `require('./config')`, `require('./db')`, `require('./handlers/privacy')` භාවිතා කරන නිසා **මේ ගොනු 3 ඔබගේ folder එකේ තිබිය යුතුය**. (පහත [ගොනු ව්‍යුහය](#-ගොනු-ව්‍යුහය) බලන්න.)

### 3. අවශ්‍ය ගොනු සාදන්න

ඔබගේ folder එකේ මේ ගොනු තිබෙනවාදැයි පරීක්ෂා කරන්න:

```
index.js          ← ප්‍රධාන bot ගොනුව
config.js         ← සැකසුම් (API keys, admin IDs, timeouts)
db.js             ← SQLite database functions
handlers/
  └── privacy.js  ← .privacy command handler
```

---

## ⚙️ Config ගොනුව සැකසීම

`index.js` එක `require('./config')` හරහා පහත දේවල් භාවිතා කරයි. ඒ නිසා ඔබගේ **`config.js`** ගොනුවේ මේ structure එක තිබිය යුතුය:

```js
// config.js
module.exports = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || 'your_groq_api_key_here',

  SESSION_DIR: './session',

  ADMIN_IDS: ['947XXXXXXXX', '947YYYYYYYY'],   // country code සමඟ, + නැතුව

  RATE_LIMIT: {
    WINDOW_MS: 60000,      // 1 minute
    MAX_MESSAGES: 20       // ඒ කාලය තුළ උපරිම messages
  },

  TIMEOUTS: {
    SELECT_BANK_MS: 120000,   // bank තෝරන්න දෙන කාලය (2 min)
    AWAITING_ID_MS: 300000    // Player ID එවන්න දෙන කාලය (5 min)
  }
};
```

### Config එකේ එක් එක් අගය වෙනස් කරන්නේ කෙසේද?

| අගය | අර්ථය | වෙනස් කරන්නේ |
|------|--------|----------------|
| `GROQ_API_KEY` | Groq AI key එක | Groq console එකෙන් අලුත් key එකක් |
| `SESSION_DIR` | WhatsApp session save වෙන folder එක | උදා: `'./wa_session'` |
| `ADMIN_IDS` | admin phone numbers | ඔබගේ numbers array එකට |
| `RATE_LIMIT.MAX_MESSAGES` | spam සීමාව | අංකය වෙනස් කරන්න |
| `TIMEOUTS.AWAITING_ID_MS` | Player ID timeout එක | milliseconds වලින් (1000 = 1 sec) |

> ⚠️ `ADMIN_IDS` array එකේ numbers **`+` ඉලක්කම නැතුව**, country code සමඟ ලියන්න. උදා: `+94 77 1234567` → `'94771234567'`.

---

## 🔑 Environment Variables (.env)

`index.js` එක ඇතුළේ පහත දේවල් `process.env` වලින් කියවයි:

| Variable | භාවිතා වෙන තැන | Default |
|----------|----------------|---------|
| `XBET_LINK` | Registration link | `https://1xbet.com` |
| `XBET_PROMO_CODE` | Promo code | `VGSL` |
| `CHANNEL_LINK` | Telegram tips channel | `https://t.me/fast_xbet_cash` |
| `GROQ_API_KEY` | AI key (config හරහා) | — |

### `.env` ගොනුවක් සාදන්න (නිර්දේශිත)

Project folder එක ඇතුළේ `.env` නමින් ගොනුවක් සාදා මෙය paste කරන්න:

```env
GROQ_API_KEY=your_groq_api_key_here
XBET_LINK=https://1xbet.com
XBET_PROMO_CODE=VGSL
CHANNEL_LINK=https://t.me/fast_xbet_cash
```

> 📌 `index.js` එක `dotenv` භාවිතා නොකරන නිසා, `.env` ගොනුව auto-load වෙන්නේ නෑ. එවිට ඔබට **දෙකෙන් එකක්** කළ යුතුය:
> - `npm install dotenv` කර `index.js` ඉහළින් `require('dotenv').config();` දාන්න, **නැතහොත්**
> - Termux එකේ export කරන්න: `export GROQ_API_KEY=xxxx` (හෝ `config.js` එකේම key එක ලියන්න).

---

## 🚀 Bot එක ආරම්භ කිරීම + QR Scan

```bash
node index.js
```

හෝ `package.json` එකේ `"start": "node index.js"` තියෙනවා නම්:

```bash
npm start
```

### පළමු වතාවට — QR Code scan කිරීම

1. Terminal එකේ QR code එකක් පෙන්වයි.
2. ඔබගේ phone එකේ **WhatsApp → ⋮ → Linked Devices → Link a Device**.
3. Terminal එකේ QR code එක scan කරන්න.
4. සාර්ථක වුණාම: `✅ Fast 1xBet Cash Bot connected!`

> 💡 **එකම phone එකෙන් QR scan කරන්න බැරි නම්** — Termux screen එකේ QR එක screenshot එකක් අරගෙන laptop/වෙන phone එකක screen එකේ open කරලා, ඔබගේ main phone එකෙන් scan කරන්න.

> 🔁 QR scan කළ පසු `session/` folder එකේ credentials save වේ. ඊළඟ වතාවේ QR ඕන නෑ — කෙලින්ම connect වේ.

---

## 🔄 Bot එක ක්‍රියා කරන ආකාරය

### 👤 පරිශීලක Commands

| User එවන දේ | Bot එක කරන දේ |
|--------------|----------------|
| *(පළමු message එක)* |  Welcome menu එක පෙන්වයි |
| `menu` | 🔥 Main menu එක පෙන්වයි (state reset වේ) |
| `1` | 💰 Deposit — bank list එක පෙන්වයි |
| `2` | 💸 Withdrawal උපදෙස් පෙන්වයි |
| `3` | 📋 Registration + promo code |
| `4` | ⚽ Tips channel link |
| `5` | 🆘 Help center |
| `6` | 🔒 Privacy policy |
| `7` | 👑 Admin panel (admin නම් පමණක්) |
| `WITHDRAW ...` | Withdrawal request handle කරයි |
| `.privacy ...` | Privacy command handle කරයි |
| `.admin` | Admin panel (admin නම් පමණක්) |
| *(වෙනත් ඕනම දෙයක්)* | Small hint prompt එක පෙන්වයි |

### 💰 Deposit Flow (පියවරෙන් පියවර)

```
User: menu
Bot : Main menu

User: 1
Bot : Deposit accounts list (1-5)        ← state = SELECT_BANK

User: 1   (BOC තෝරයි)
Bot : BOC account details + උපදෙස්

User: [slip photo එවයි]
Bot : 🔍 AI මින් slip පරීක්ා කරයි
      ├─ AI එක receipt එකක් ලෙස හඳුනාගත්තොත්:
      │    ├─ caption එකේ Player ID තියෙනවා නම් → කෙලින්ම CONFIRM
      │    └─ caption ID නෑ නම් → Player ID අසයි  ← state = AWAITING_ID
      └─ receipt එකක් නොවේ නම් → "වලංගු Receipt නොවේ" කියයි

User: 1071114543   (Player ID)
Bot : ✅ DEPOSIT DETAILS CONFIRMED!
```

### 🤖 AI Slip Analysis හැසිරීම

- Bot එක slip photo එක Groq vision model (`llama-3.2-11b-vision-preview`) වෙත යවයි.
- Model එක JSON එකක් return කරයි: `is_receipt`, `bank_name`, `amount`, `date_time`.
- **`is_receipt: false`** නම් bot එක slip එක **reject** කරයි ("වලංගු Receipt නොවේ").
- **`is_receipt: true`** නම් bank/amount/date කියවා Player ID ඉල්ලයි / confirm කරයි.

> ⚠️ **වැදගත්:** මෙම model එක Groq විසින් ඉවත් (deprecate) කර තිබිය හැකිය. එවිට AI එක fail වී හැම slip එකක්ම reject විය හැකිය. එවිට [AI model එක වෙනස් කරන ආකාරය](#ai-model-එක-වෙනස්-කිරීම) බලන්න.

### 💸 Withdrawal Flow

- User `2` එවූ විට 1xBet Cash method උපදෙස් + withdrawal address (City/Street) පෙන්වයි.
- User උපදෙස් අනුව withdrawal approve කරගෙන, Secret Code + details text එකක් ලෙස එවයි.
- *(මෙම single-file version එකේ withdrawal details auto-parse වන්නේ `WITHDRAW` command එකෙන් පමණි — සාමාන්‍ය text එකක් ලෙස එවුවහොත් "small hint" එක පෙන්වයි.)*

### 👑 Admin හැසිරීම

- `config.ADMIN_IDS` array එකේ තියෙන phone number එකකින් message එකක් ආවොත් පමණක් `7` / `.admin` වැඩ කරයි.
- Admin නොවේ නම් → `❌ Access Denied.`
- Admin නම් → database එකේ total user count එක පෙන්වයි.

### 🚫 Bot එක ignore කරන දේ

- **Group messages** (`@g.us`) — private chats වලට පමණක් පිළිතුරු දෙයි.
- **තමන්ගේම messages** (`fromMe`).
- **PDF / documents** — "Slip Photo (JPG/PNG) එවන්න" කියයි.
- **Rate limit ඉක්මවූ messages** — "මිනිත්තුවක් රැඳෙන්න" කියයි.

---

## 📁 ගොනු ව්‍යුහය

```
fast-xbet-cash-bot/
│
├── index.js            ← ප්‍රධාන bot logic (මෙම README එකේ code එක)
├── config.js           ← API keys, admin IDs, rate limit, timeouts
├── db.js               ← SQLite: dbGet, dbRun, stateCache, initDatabase, closeDatabase
├── package.json
├── .env                ← (optional) GROQ_API_KEY, XBET_LINK, etc.
│
├── handlers/
│   └── privacy.js      ← handlePrivacyCommand (export කරන්න)
│
├── session/            ← WhatsApp credentials (auto-create වේ — git ට දාන්න එපා!)
└── *.sqlite            ← database ගොනුව (db.js එක සාදයි)
```

### `db.js` එකේ තිබිය යුතු exports

`index.js` එක මේවා භාවිතා කරන නිසා `db.js` එකේ මේවා export විය යුතුය:

```js
module.exports = { dbGet, dbRun, stateCache, initDatabase, closeDatabase };
```

- `dbGet(sql, params)` — එක row එකක් return කරයි (async)
- `dbRun(sql, params)` — insert/update කරයි (async)
- `stateCache` — `Map` එකක් (තාවකාලික user states)
- `initDatabase()` — tables සාදයි (`users` table එක අවශ්‍යයි: `jid` column සමඟ)
- `closeDatabase()` — shutdown එකේදී DB close කරයි

### `handlers/privacy.js` එකේ තිබිය යුතු export

```js
module.exports = { handlePrivacyCommand };
```

---

## 🛠️ යමක් වෙනස් කරගන්න ආකාරය

### 🏦 බැංකු විස්තර වෙනස් කිරීම

`index.js` එකේ `BANK_DETAILS` object එක සොයා වෙනස් කරන්න:

```js
const BANK_DETAILS = {
  '1': { name: 'Bank of Ceylon (BOC)', accName: 'Vgs Lakmal', accNo: '95645895', displayNo: '956 45 895', branch: 'Walasmulla' },
  // ... අනෙක් බැංකු
};
```

| Field | අර්ථය |
|-------|--------|
| `name` | බැංකුවේ නම |
| `accName` | ගිණුම් හිමියාගේ නම |
| `accNo` | සැබෑ ගිණුම් අංකය |
| `displayNo` | user ට පෙන්වන formatted අංකය |
| `branch` | ශාඛාව |

> 📌 බැංකුවක් **එකතු/ඉවත්** කළොත්, `DEPOSIT_MENU` constant එකේ තියෙන list එකත් (`1️⃣ 🏦 ...`) ඒ අනුව වෙනස් කරන්න. අංක ගැලපෙන්න ඕන.

### 📍 Withdrawal Address වෙනස් කිරීම

`WITHDRAW_MENU` constant එකේ මේ lines සොයා වෙනස් කරන්න:

```js
📍 City: Walasmulla
📍 Street: Beliaththa Road 24/7
```

### 🎁 Promo Code / Links වෙනස් කිරීම

`.env` ගොනුවේ (හෝ export commands වල):

```env
XBET_PROMO_CODE=ඔබගේ_code
XBET_LINK=ඔබගේ_register_link
CHANNEL_LINK=ඔබගේ_telegram_link
```

### 📝 Messages / Templates වෙනස් කිරීම

`index.js` ඉහළින් ඇති **constants** වෙනස් කරන්න:

- `WELCOME_MENU` — නව user ට පෙනෙන message
- `MAIN_MENU` — menu list එක
- `DEPOSIT_MENU`, `WITHDRAW_MENU`
- `REGISTRATION_INFO`, `TIPS_INFO`, `HELP_INFO`, `PRIVACY_POLICY`
- `SMALL_HINT_PROMPT` — නොතේරුණු input එකට පිළිතුර

> 💡 මේවා සාමාන්‍ය JavaScript template strings (backticks `` ` ``) බැවින්, ඇතුළේ emojis / line breaks නිදහසේ වෙනස් කළ හැකිය. **නමුත්** backtick (`` ` ``) අක්ෂරය string එක ඇතුළේ භාවිතා කරන්න එපා — එවිට syntax error එකක් එයි. (උදා: `` `${...}` `` වෙනුවට සාමාන්‍ය text භාවිතා කරන්න.)

### 🤖 AI Model එක වෙනස් කිරීම

`analyzeSlipImage` function එකේ මේ line එක සොයන්න:

```js
model: 'llama-3.2-11b-vision-preview',
```

එය Groq console එකේ **දැන් වැඩ කරන vision model** ID එකට වෙනස් කරන්න. උදා:

```js
model: 'meta-llama/llama-4-scout-17b-16e-instruct',
```

> 🔍 හරි model ID එක බලාගන්න: [console.groq.com](https://console.groq.com) → **Models** → Vision / Multimodal filter.

### 👤 Admin IDs වෙනස් කිරීම

`config.js` එකේ `ADMIN_IDS` array එක වෙනස් කරන්න (ඉහත [Config](#-config-ගොනුව-සැකසීම) කොටස බලන්න).

### ⏱️ Rate Limit / Timeouts වෙනස් කිරීම

`config.js` එකේ `RATE_LIMIT` සහ `TIMEOUTS` වෙනස් කරන්න.

### 🔢 Player ID format එක වෙනස් කිරීම

Player ID එක digits 5–12 ලෙස පරීක්ෂා කරයි. මෙය වෙනස් කරන්න නම් `index.js` ඉහළින්:

```js
const PLAYER_ID_REGEX = /^\d{5,12}$/;
```

උදා: digits 6–15 ඕන නම් → `/^\d{6,15}$/`.

---

## ⚠️ වැදගත් සටහන් / Troubleshooting

### ❌ "Connection Failure" / QR එක එන්නේ නෑ

- `session/` folder එක delete කර නැවත start කරන්න:
  ```bash
  rm -rf session
  node index.js
  ```
- Baileys version එක outdated නම් update කරන්න:
  ```bash
  npm install @whiskeysockets/baileys@latest
  ```
- Internet / DNS පරීක්ෂා කරන්න.

### ❌ "Logged out" message එක

- Session එක invalidate වී ඇත. `session/` folder එක delete කර නැවත QR scan කරන්න.

### ❌ සියලු slip reject වෙනවා ("වලංගු Receipt නොවේ")

- බොහෝ විට **AI model එක deprecated** වී ඇත. [AI model එක වෙනස් කරන්න](#ai-model-එක-වෙනස්-කිරීම).
- නැතහොත් `GROQ_API_KEY` එක වැරදියි / quota ඉවරයි.

### ❌ "Database error"

- `db.js` ගොනුව හරියට තිබෙනවාද, `users` table එක සැදෙනවාද පරීක්ෂා කරන්න.
- `initDatabase()` start එකේදී call වෙනවාද බලන්න (`✅ Database ready.` log එක එන්න ඕන).

### ❌ PDF එවුවොත්

- Bot එක PDF කියවන්නේ නෑ — JPG/PNG photo එකක් එවන්න කියයි.

### 🔋 Termux එකේ bot එක නවතිනවා

- Termux app එක background එකේ kill විය හැකිය. **24/7 run** කරන්න නම් VPS එකක deploy කිරීම හොඳයි.
- Termux එකේ battery optimization off කරන්න, `termux-wake-lock` භාවිතා කරන්න.

### 🛑 Bot එක නවත්වන්න

- Terminal එකේ `Ctrl + C` ඔබන්න. එවිට `shutdown()` function එක DB එක හරියට close කරයි.

---

## 🔐 ආරක්ෂාව

- `session/` folder එක සහ `.env` ගොනුව **කිසිවිටෙක GitHub / public** තැනකට upload කරන්න එපා (`.gitignore` එකට දාන්න).
- `GROQ_API_KEY` එක code එක ඇතුළේ hardcode නොකර `.env` / config හරහා තබන්න.
- Admin phone numbers (`ADMIN_IDS`) රහසක් ලෙස සලකන්න.
- මෙය මූල්‍ය සේවාවක් බැවින්, සැබෑ ාවිතයට පෙර **KYC / legal / age-verification** කරුණු පරීක්ෂා කරන්න.

### නිර්දේශිත `.gitignore`

```gitignore
node_modules/
.env
session/
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

---

## 🧩 ඉක්මන් Reference — Commands

```text
menu              → Main menu
1                 → Deposit
2                 → Withdrawal
3                 → Registration
4                 → Tips
5                 → Help
6                 → Privacy
7                 → Admin (admin පමණක්)
WITHDRAW <ID> <Amount> <Bank> <AccNo>   → Withdrawal request
.privacy get      → Privacy preference බලන්න
.privacy set delete → Data මකන්න
```

---

## 📄 බලපත්‍රය / සටහන

මෙම bot එක අධ්‍යාපනික / පෞද්ගලික භාවිතය සඳහාය. Betting / මූල්‍ය සේවා නීති රීති ඔබගේ රටේ නීතියට අනුව පරීක්ෂා කරගන්න.

---