```markdown
#  Fast 1xBet Cash Bot — WhatsApp Bot

> 1xBet පරිශීලකයන් සඳහා **Deposit, Withdrawal, Registration, Tips** සහ අනෙකුත් සේවා WhatsApp හරහා ස්වයංක්‍රීයව ලබාදෙන AI සහායක Bot එකකි.
> මෙය **Termux / Linux / VPS** වැනි පරිසරයක **SQLite** database එකක් සමඟ ධාවනය කිරීමට සකසා ඇත.

මෙම project එකේ entry point එක **`src/index.js`** වේ. Termux, Linux සහ VPS වල run කළ හැක.

---

## 📋 අන්තර්ගතය

1. [විශේෂාංග](#-විශේෂාංග)
2. [අවශ්‍ය දේවල් (Prerequisites)](#-අවශ්‍ය-දේවල්-prerequisites)
3. [Termux ඉක්මන් Setup](#-termux-ඉක්මන්-setup)
4. [ස්ථාපනය (Installation)](#-ස්ථාපනය-installation)
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
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts python make clang pkg-config
node -v
```

> `better-sqlite3` native package එක build කිරීමට `python`, `make` සහ `clang` අවශ්‍ය වේ.

### Termux ඉක්මන් Setup

Project folder එකට ගොස් පහත commands run කරන්න:

```bash
bash termux-setup.sh
nano .env
npm start
```

Script එක dependencies install කර `.env` file එක සාදයි. `.env` තුළ `GROQ_API_KEY` එක ඔබගේ Groq API key එකෙන් වෙනස් කරන්න.

---

## 📦 ස්ථාපනය (Installation)

### 1. Project folder එකට යන්න

```bash
cd fast-xbet-cash-bot
```

### 2. Dependencies ස්ථාපනය කරන්න

GitHub එකෙන් project එක clone කළා නම්:

```bash
npm ci --omit=dev --registry=https://registry.npmjs.org
```

> `npm ci` fail වුණොත් Termux native tools install වී තිබේද බලන්න: `pkg install -y python make clang pkg-config`.

---

## 🔑 Environment Variables (.env)

`src/config/index.js` එක පහත environment variables කියවයි. `.env.example` copy කර `.env` සාදා values වෙනස් කරන්න:

| Variable | භාවිතා වෙන තැන | Default |
|----------|----------------|---------|
| `XBET_LINK` | Registration link | `https://1xbet.com` |
| `XBET_PROMO_CODE` | Promo code | `VGSL` |
| `CHANNEL_LINK` | Telegram tips channel | `https://t.me/fast_xbet_cash` |
| `GROQ_API_KEY` | AI key (අවශ්‍යයි) | — |
| `ADMIN_IDS` | Admin phone numbers, comma-separated | empty |
| `PAIRING_PHONE_NUMBER` | QR වෙනුවට pairing code භාවිතා කරන phone number | empty |
| `SESSION_DIR` | WhatsApp session folder | `./session` |
| `DATABASE_FILE` | SQLite database file | `./data/bot.sqlite` |

### `.env` file එක සකසන්න

```bash
cp .env.example .env
nano .env
```

`GROQ_API_KEY` එක අනිවාර්යයි. `ADMIN_IDS` සඳහා `+` නැති country code සහිත number දාන්න. උදා: `94771234567`.

---

## 🚀 Bot එක ආරම්භ කිරීම + QR Scan

```bash
npm start
```

එය ඇතුළත `node src/index.js` run කරයි.

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
├── src/index.js        ← ප්‍රධාන entry point
├── src/config/index.js ← environment config validation
├── src/db/index.js     ← SQLite database functions
├── src/bot/             ← WhatsApp connection and message routing
├── package.json
├── .env                ← GROQ_API_KEY and optional settings
├── .env.example        ← safe config template
│
├── src/handlers/        ← message handlers
│
├── session/            ← WhatsApp credentials (auto-create වේ — git ට දාන්න එපා!)
└── data/bot.sqlite     ← SQLite database (auto-create වේ)
```

---

## 🛠️ යමක් වෙනස් කරගන්න ආකාරය

### 🏦 බැංකු විස්තර වෙනස් කිරීම

`src/services/bankService.js` එකේ bank details වෙනස් කරන්න:

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

අදාළ values `src/config/index.js` හරහා `.env` file එකෙන් වෙනස් කරන්න:

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

`.env` එකේ `ADMIN_IDS` value එක comma-separated ලෙස වෙනස් කරන්න:

```env
ADMIN_IDS=94771234567,94777876543
```

### ⏱️ Rate Limit / Timeouts වෙනස් කිරීම

`.env` එකේ `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_MESSAGES`, සහ timeout values වෙනස් කරන්න.

### 🔢 Player ID format එක වෙනස් කිරීම

Player ID එක digits 5–12 ලෙස පරීක්ෂා කරයි. මෙය වෙනස් කරන්න නම් `src/utils/helpers.js` හි validation එක වෙනස් කරන්න.

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
  npm start
  ```
- Baileys version එක outdated නම් update කරන්න:
  ```bash
  npm install @whiskeysockets/baileys@latest --registry=https://registry.npmjs.org
  ```
- Internet / DNS පරීක්ෂා කරන්න.

### ❌ "Logged out" message එක

- Session එක invalidate වී ඇත. `session/` folder එක delete කර නැවත QR scan කරන්න.

### ❌ සියලු slip reject වෙනවා ("වලංගු Receipt නොවේ")

- බොහෝ විට **AI model එක deprecated** වී ඇත. [AI model එක වෙනස් කරන්න](#ai-model-එක-වෙනස්-කිරීම).
- නැතහොත් `GROQ_API_KEY` එක වැරදියි / quota ඉවරයි.

### ❌ "Database error"

- `src/db/index.js` file එක load වෙනවාද සහ `data/` folder එක write කළ හැකිද පරීක්ෂා කරන්න.
- `npm start` output එකේ `Database initialized` log එක එන්න ඕන.

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