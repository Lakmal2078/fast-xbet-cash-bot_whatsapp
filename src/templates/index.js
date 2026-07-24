const config = require('../config');

// Bilingual helper — returns Sinhala or English string based on lang
function _t(si, en, lang) {
  return lang === 'en' ? en : si;
}

// Status icon helper
function statusIcon(status) {
  if (!status) return '❓';
  const s = status.toUpperCase();
  if (s === 'APPROVED') return '✅';
  if (s === 'REJECTED') return '❌';
  if (s === 'PENDING') return '⏳';
  return '🔍'; // AI_REVIEW / MANUAL_REVIEW
}

// ═══════════════════════════════════════════
// WELCOME / MENU
// ═══════════════════════════════════════════
function welcome(lang = 'si') {
  return _t(
    `🚀 Fast Xbet Official AI Support

1xBet Deposit, Withdrawal ඇතුළු සියලුම සේවාවන් සඳහා අපගේ AI සහායක සම්බන්ධ කරගැනීමට "menu" ලෙස සටහන් කර එවන්න.

💡 Send "menu" anytime to open the main menu.`,
    `🚀 Fast Xbet Official AI Support

Send "menu" to access all our services — Deposits, Withdrawals, Registration, Tips, and more.

💡 Type "menu" anytime to open the main menu.`,
    lang
  );
}

function mainMenu(lang = 'si') {
  return `🔥 FAST XBET OFFICIAL MAIN MENU 🔥

1️⃣ Cash Deposit
2️⃣ Cash Withdrawal
3️⃣ 1xBet Registration & Bonus
4️⃣ Daily Free Tips
5️⃣ Help Center
6️⃣ Privacy Policy
7️⃣ Admin Panel

${_t('සේවාව තෝරන්න (1-7):', 'Select a service (1-7):', lang)}
💡 Send "menu" ${_t('ඕනෑම වේලාවක', 'anytime', lang)} to return here.
💬 Send "cancel" to exit an active flow.`;
}

// ═══════════════════════════════════════════
// DEPOSIT
// ═══════════════════════════════════════════
function depositMenu(banks = [], lang = 'si') {
  const lines = banks
    .map((bank) => `${bank.sort_key}️⃣ 🏦 ${bank.bank_name}`)
    .join('\n');

  return `💰 DEPOSIT ACCOUNTS 💰

${lines}

💡 ${_t('ගිණුම් විස්තර ලබාගැනීමට අදාළ අංකය එවන්න.', 'Send the relevant number to get account details.', lang)}
💡 ${_t('ප්‍රධාන menu වෙත ආපසු යන්න "menu" ලෙස එවන්න.', 'Send "menu" to return to the main menu.', lang)}
💬 Send "cancel" to exit.`;
}

function bankDetails(bank, lang = 'si') {
  return `🏦 ${bank.bank_name.toUpperCase()} – ACCOUNT DETAILS

📌 Bank: ${bank.bank_name}
👤 Account Holder: ${bank.account_holder}
🔢 Account Number: "${bank.display_number || bank.account_number}"
📍 Branch: ${bank.branch || 'N/A'}
──────────────────────────
💳 How to Deposit Funds to Your 1xBet Account

1️⃣ Transfer the desired amount to the bank account provided above.
2️⃣ ️ Important: In the Remark / Reference field, you must enter your 1xBet Player ID.
3️⃣ After completing the transfer, send us a clear photo or screenshot (JPG/PNG) of the receipt, together with your 1xBet ID, in this chat.

📸 Photos, screenshots and cropped images are all accepted. PDF files are not supported.
⚡ Once we receive and verify your receipt, your deposit will be credited within a few minutes.

💬 ${_t('"menu" → ප්‍රධාන menu.', 'Send "menu" to return to the main menu.', lang)}`;
}

function processingSlip(lang = 'si') {
  return _t(
    '🔍 AI මඟින් Slip එක පරීක්ෂා කරයි... කරුණාකර රැඳෙන්න.',
    '🔍 Analysing your slip via AI... please wait.',
    lang
  );
}

function invalidSlip(lang = 'si') {
  return _t(
    `⚠️ මෙම ඡායාරූපයෙන් ගෙවීම් විස්තර හඳුනාගත නොහැකි විය.

කරුණාකර පහත දේ පැහැදිලිව පෙනෙන photo / screenshot එකක් එවන්න:
• මුදල (Amount)
• බැංකුව (Bank name)
• Transaction reference / receipt number
• දිනය සහ වේලාව (Date/Time)`,
    `⚠️ Payment details could not be identified from this image.

Please send a clear photo or screenshot showing:
• Amount
• Bank name
• Transaction reference / receipt number
• Date and time`,
    lang
  );
}

function duplicateSlip(depositId, lang = 'si') {
  return _t(
    `⚠️ මෙම slip එක කලින්ම ඉදිරිපත් කර ඇත.
Reference ID: ${depositId}

මෙය වැරදීමක් යැයි ඔබ සිතන්නේ නම්, කරුණාකර support අමතන්න.`,
    `⚠️ This slip has already been submitted.
Reference ID: ${depositId}

If you think this is an error, please contact support.`,
    lang
  );
}

function crossUserDuplicateAlert(existingDeposit, newDeposit) {
  return `🚨 *Duplicate Reference Detected!*

A deposit with the same transaction reference was submitted by TWO different users.

🔖 Reference: ${newDeposit.reference}
📌 Original deposit: #${existingDeposit.id} by ${existingDeposit.user_jid}
📌 New deposit: #${newDeposit.id} by ${newDeposit.user_jid}

⚠️ Please review both deposits manually before approving either.`;
}

function askPlayerId(deposit, lang = 'si') {
  return `✅ *Receipt Detected!*

🆔 Reference: #${deposit.id}
🏦 *Bank:* ${deposit.bank_name || 'Unidentified'}
💰 *Amount:* ${deposit.amount_text || 'Unidentified'}
${deposit.detected_date_time ? `📅 *Date/Time:* ${deposit.detected_date_time}\n` : ''}${deposit.reference ? `🔖 *Txn Ref:* ${deposit.reference}\n` : ''}${deposit.sender ? `📤 *From:* ${deposit.sender}\n` : ''}${deposit.receiver ? `📥 *To:* ${deposit.receiver}\n` : ''}
📌 ${_t('ඔබගේ *1xBet Player ID* (5-12 digit) enter කරන්න:', 'Please enter your *1xBet Player ID* (5–12 digits):', lang)}
💬 Send "cancel" to exit.`;
}

function depositReceived(deposit, lang = 'si') {
  return `✅ *DEPOSIT DETAILS CONFIRMED!*

🆔 Reference ID: ${deposit.id}
📌 1xBet Player ID: ${deposit.player_id || 'Pending'}
🏦 Bank: ${deposit.bank_name || 'Unidentified'}
💰 Deposit Amount: ${deposit.amount_text || 'Unidentified'}
${deposit.detected_date_time ? `📅 Date/Time: ${deposit.detected_date_time}\n` : ''}${deposit.reference ? `🔖 Txn Reference: ${deposit.reference}\n` : ''}📊 Status: ${deposit.status}
──────────────────────────

⏳ ${_t('ඔබගේ deposit request ලැබී ඇත. අපගේ කණ්ඩායම විනාඩි 5–15ක් ඇතුළත review කර ඔබගේ 1xBet ගිණුමට credit කරනු ඇත.', 'Your deposit request has been received. Our team will review and credit your 1xBet account within 5–15 minutes.', lang)}

💬 ${_t('"menu" → ප්‍රධාන menu.', 'Type "menu" to return to the main menu.', lang)}`;
}

// ═══════════════════════════════════════════
// WITHDRAWAL
// ═══════════════════════════════════════════
function withdrawMenu(lang = 'si') {
  return `🏦 How to Withdraw Funds via Fast Xbet Official
📍 City: Walasmulla
📍 Street: Beliaththa Road 24/7
────────────────────
1️⃣ Log in to your 1xBet account and go to Withdraw.
2️⃣ Select *1xBet Cash* as your withdrawal method.
3️⃣ Choose our Withdrawal Address shown above, enter the amount you wish to withdraw, and tap Confirm.
4️⃣ Once your withdrawal request has been approved, send us the following details in this chat:
────────────────────
💰 CASH WITHDRAWAL REQUEST
📌 Player ID: [Your 1xBet Player ID]
💵 Amount: [e.g., LKR 5,000]
🔐 Secret Code: [Your Secret Code]
🏦 Your Bank Details:
   • Bank Name:
   • Account Holder:
   • Account Number:
   • Branch:
────────────────────
💵 Amount must be between LKR ${config.MIN_WITHDRAW_LKR} and LKR ${config.MAX_WITHDRAW_LKR}.
⚡ ${_t('ඉහත විස්තර ලැබීමෙන් පසු, විනාඩි 5–15ක් ඇතුළත ඔබගේ බැංකු ගිණුමට මුදල් transfer කරනු ඇත.', 'After we receive the above information, funds will be transferred to your bank account within 5–15 minutes.', lang)}
✅ No service charges or processing fees apply.

💬 ${_t('Help Center → menu → 5. "menu" → ප්‍රධාන menu.', 'For help, select Help Center (option 5). Send "menu" to return.', lang)}`;
}

function withdrawDetailsReceived(lang = 'si') {
  return _t(
    `✅ ඔබගේ withdrawal විස්තර ලැබුණා.

අපගේ කණ්ඩායම ඔබගේ ඉල්ලීම පරීක්ෂා කර, මිනිත්තු 5–15ක් ඇතුළත ඔබගේ බැංකු ගිණුමට මුදල් බැර කරනු ඇත.
අවශ්‍ය නම් අපි ඔබව මෙතනින්ම දැනුවත් කරන්නෙමු.

💬 "menu" → ප්‍රධාන menu.`,
    `✅ Your withdrawal details have been received.

Our team will review your request and transfer the funds to your bank account within 5–15 minutes.
We will notify you here once it is processed.

💬 Send "menu" to return to the main menu.`,
    lang
  );
}

function withdrawFormat(lang = 'si') {
  return _t(
    `⚠️ Format වැරදිය.

භාවිතා කරන්න:
WITHDRAW <PlayerID> <Amount> <BankName> <AccNo> <AccountHolder>

Example:
WITHDRAW 123456 5000 BOC 95645895 Vgs Lakmal`,
    `⚠️ Invalid format.

Use:
WITHDRAW <PlayerID> <Amount> <BankName> <AccNo> <AccountHolder>

Example:
WITHDRAW 123456 5000 BOC 95645895 Vgs Lakmal`,
    lang
  );
}

function withdrawAmountInvalid(min, max, lang = 'si') {
  return _t(
    `⚠️ වලංගු නොවන withdrawal මුදල.
ඉඩ ලබා දී ඇති පරාසය: LKR ${min} - LKR ${max}.`,
    `⚠️ Invalid withdrawal amount.
Allowed range: LKR ${min} – LKR ${max}.`,
    lang
  );
}

function withdrawReceived(withdrawal, lang = 'si') {
  return `💸 *WITHDRAWAL REQUEST RECEIVED!*

🆔 Reference ID: ${withdrawal.id}
📌 Player ID: ${withdrawal.player_id}
💰 Amount: ${withdrawal.amount_text}
🏦 Bank: ${withdrawal.bank_name}
🔢 Acc No: ${withdrawal.account_number}
📊 Status: ${withdrawal.status}

⏳ ${_t('Process time: 5–15 minutes. Admin confirm කළ පසු notify කෙරේ.', 'Process time: 5–15 minutes. You will be notified once approved.', lang)}

💬 Send "menu" to return to the main menu.`;
}

// ═══════════════════════════════════════════
// INFO PAGES
// ═══════════════════════════════════════════
function registrationInfo(lang = 'si') {
  return `📋 1xBet Registration & Bonus

👉 Register Link:
${config.XBET_LINK}
🎁 Promo Code: ${config.XBET_PROMO_CODE}
━━━━━━━━━━━━━━
${_t(`✅ Register කරන ආකාරය:
1️⃣ හත link site open කරන්න
2️⃣ "Register" ක්ලික් කරන්න
3️⃣ ඔබගේ details ඇතුළත් කරන්න
4️⃣ Promo Code: ${config.XBET_PROMO_CODE}
5️⃣ Register සම්පූර්ණ කරන්න

🎉 Bonus: ප්‍රථම Deposit මත 150% Bonus!`,
`✅ How to Register:
1️⃣ Open the link above
2️⃣ Click "Register"
3️⃣ Fill in your details
4️⃣ Enter Promo Code: ${config.XBET_PROMO_CODE}
5️⃣ Complete registration

🎉 Bonus: 150% on your first deposit!`,
    lang)}`;
}

function tipsInfo(lang = 'si') {
  return `⚽ Daily Free Tips

🔥 ${_t('සෑම දිනකම FREE Tips ලබාගන්න!', 'Get FREE tips every day!', lang)}
📢 Telegram Channel:
${config.CHANNEL_LINK}
━━━━━━━━━━━━━━
${_t(`1️⃣ හත link open කරන්න
2️⃣ "Join" click කරන්න
3️⃣ Daily tips ලබාගන්න 🎯`,
`1️⃣ Open the link above
2️⃣ Click "Join"
3️⃣ Get daily tips 🎯`,
    lang)}`;
}

function helpInfo(lang = 'si') {
  return _t(
    `🆘 Help Center
━━━━━━━━━━━━━━
💰 Deposit: Menu → 1 → Bank තෝරා Slip photo
💸 Withdrawal: Menu → 2 → Instructions follow
📋 Registration: Menu → 3 → Promo code use
⚽ Tips: Menu → 4 → Channel join
🔒 Privacy: .privacy set / .privacy get
📋 History: "history" ලෙස එවන්න
🌐 Language: "lang english" / "lang sinhala"
━━━━━━━━━━━━━━
ගැටළු: Admin Panel → Menu → 7
💡 "menu" → Main Menu`,
    `🆘 Help Center
━━━━━━━━━━━━━━
💰 Deposit: Menu → 1 → Choose bank → Send slip
💸 Withdrawal: Menu → 2 → Follow instructions
📋 Registration: Menu → 3 → Use promo code
⚽ Tips: Menu → 4 → Join Telegram channel
🔒 Privacy: .privacy set / .privacy get
📋 History: Send "history"
🌐 Language: "lang english" / "lang sinhala"
━━━━━━━━━━━━━━
Issues: Admin Panel → Menu → 7
💡 "menu" → Main Menu`,
    lang
  );
}

// ============================================================
// PRIVACY POLICY
// ============================================================
function privacyPolicy(lang = 'si') {
  return `🔒 *PRIVACY POLICY — Fast Xbet Official Sri Lanka*
━━━━━━━━━━━━━━

*1️⃣ ${_t('එකතු කරන තොරතුරු (Information We Collect)', 'Information We Collect', lang)}*
${_t(`අපගේ සේවාව ලබා දීම සඳහා අපි ඔබගෙන් පහත තොරතුරු පමණක් ඉල්ලා සිටින්නෙමු:
• ඔබගේ 1xBet පරිශීලක හැඳුනුම්පත (User ID)
• මුදල් තැන්පත් කළ බව තහවුරු කරන රිසිට්පත් (Deposit Receipts)
• මුදල් ලබා ගැනීම සඳහා අවශ්‍ය වන ආරක්ෂක කේත (Security Codes)
• ඔබගේ බැංකු ගිණුම් විස්තර (මුදල් එවීමට පමණක්)`,
`We only request the following information to provide our service:
• Your 1xBet User ID
• Deposit receipts to confirm transactions
• Security codes for withdrawals
• Your bank account details (for fund transfers only)`,
    lang)}

*2️⃣ ${_t('තොරතුරු භාවිතා කරන ආකාරය (How We Use Information)', 'How We Use Information', lang)}*
${_t(`ඔබ ලබා දෙන තොරතුරු භාවිතා කරනුයේ:
• ඔබගේ 1xBet ගිණුමට මුදල් තැන්පත් කිරීමට
• ඔබ ඉල්ලා සිටින මුදල් ලබා ගැනීම් (Withdrawals) තහවුරු කර ඔබගේ බැංකු ගිණුමට එවීම සඳහා පමණි`,
`Your information is used exclusively to:
• Credit funds to your 1xBet account
• Process and transfer approved withdrawals to your bank account`,
    lang)}

*3️⃣ ${_t('දත්ත ආරක්ෂණය (Data Protection)', 'Data Protection', lang)}*
${_t(`• ඔබගේ කිසිදු පෞද්ගලික තොරතුරක් බාහිර පාර්ශවයන් වෙත විකිණීම හෝ හුවමාරු කිරීම සිදු නොකෙරේ
• සියලුම ගනුදෙනු විස්තර රහසිගතව තබා ගන්නා අතර, සේවාව අවසන් වූ පසු අනවශ්‍ය දත්ත පද්ධතියෙන් ඉවත් කරනු ලැබේ`,
`• We never sell or share your personal information with third parties
• All transaction data is kept confidential and unnecessary data is removed after service completion`,
    lang)}

*4️⃣ ${_t('වගකීම් සහතිකය (Disclaimer)', 'Disclaimer', lang)}*
${_t(`• අප සේවාව ලබා දෙන්නේ තැන්පතු සහ මුදල් ලබා ගැනීම් පහසු කිරීමට පමණි
• 1xBet ආයතනය සමඟ ඇති වන තාක්ෂණික ගැටලු හෝ ක්‍රීඩාවෙන් වන පාඩු සම්බන්ධයෙන් අප වගකීමක් දරනු නොලැබේ
• ඔබගේ 1xBet ගිණුමේ රහස්‍යභාවය සුරැකීම ඔබ සතු වගකීමකි`,
`• Our service is limited to facilitating deposits and withdrawals
• We are not responsible for technical issues with 1xBet or any losses from gameplay
• Keeping your 1xBet account credentials secure is your responsibility`,
    lang)}

*5️⃣ ${_t('අප හා සම්බන්ධ වීමට (Contact Us)', 'Contact Us', lang)}*
${_t('පෞද්ගලිකත්වය පිළිබඳ කිසියම් ගැටලුවක් ඇත්නම් පහත අංකය හරහා අප හා සම්බන්ධ වන්න:', 'For any privacy concerns, contact us at:', lang)}
📞 +94765865387
━━━━━━━━━━━━━━
© 2026 Fast Xbet Official Sri Lanka. All rights reserved.`;
}

// ═══════════════════════════════════════════
// LANGUAGE TOGGLE
// ═══════════════════════════════════════════
function langChanged(lang) {
  return _t(
    `✅ භාෂාව සිංහල ලෙස සකස් කරන ලදී. 🇱🇰

"menu" ලෙස ටයිප් කර ප්‍රධාන menu දකින්න.`,
    `✅ Language set to English. 🇬🇧

Type "menu" to open the main menu.`,
    lang
  );
}

function langHelp(lang = 'si') {
  return _t(
    `🌐 භාෂාව මාරු කිරීමට:
"lang sinhala" හෝ "lang si" → සිංහල
"lang english" හෝ "lang en" → English`,
    `🌐 To switch language:
"lang sinhala" or "lang si" → Sinhala
"lang english" or "lang en" → English`,
    lang
  );
}

// ═══════════════════════════════════════════
// TRANSACTION HISTORY
// ═══════════════════════════════════════════
function historyMessage(deposits = [], withdrawals = [], lang = 'si') {
  const fmtDate = (raw) => {
    if (!raw) return '—';
    // SQLite CURRENT_TIMESTAMP → "YYYY-MM-DD HH:MM:SS"
    return String(raw).slice(0, 16);
  };

  const depositLines = deposits.length
    ? deposits
        .map(
          (d) =>
            `${statusIcon(d.status)} #${d.id} | ${d.bank_name || '—'} | ${d.amount_text || '—'} | ${fmtDate(d.created_at)}`
        )
        .join('\n')
    : _t('  (deposit නැත)', '  (no deposits)', lang);

  const withdrawLines = withdrawals.length
    ? withdrawals
        .map(
          (w) =>
            `${statusIcon(w.status)} #${w.id} | ${w.amount_text || '—'} | ${w.bank_name || '—'} | ${fmtDate(w.created_at)}`
        )
        .join('\n')
    : _t('  (withdrawal නැත)', '  (no withdrawals)', lang);

  return `📋 ${_t('ඔබගේ ගනුදෙනු ඉතිහාසය (Last 10)', 'Your Transaction History (Last 10)', lang)}

💰 ${_t('Deposits', 'Deposits', lang)}
${depositLines}

💸 ${_t('Withdrawals', 'Withdrawals', lang)}
${withdrawLines}

✅ Approved  ⏳ Pending  🔍 Under Review  ❌ Rejected
💬 ${_t('"menu" → ප්‍රධාන menu.', 'Send "menu" to return.', lang)}`;
}

// ═══════════════════════════════════════════
// SAVED BANK — WITHDRAWAL QUICK-FILL
// ═══════════════════════════════════════════
function withdrawMenuWithSavedBank(savedBank, lang = 'si') {
  const bankLine = `${savedBank.bank_name || '—'} | ${savedBank.account_number || '—'} | ${savedBank.account_holder || '—'}${savedBank.branch ? ` | ${savedBank.branch}` : ''}`;

  const prefilledTemplate = `📌 Player ID: [Your 1xBet Player ID]
💵 Amount: [e.g., LKR 5,000]
🔐 Secret Code: [Your Secret Code]
🏦 Your Bank Details:
   • Bank Name: ${savedBank.bank_name || ''}
   • Account Holder: ${savedBank.account_holder || ''}
   • Account Number: ${savedBank.account_number || ''}
   • Branch: ${savedBank.branch || ''}`;

  const savedBankNotice = _t(
    `──────────────────
💳 *Saved Bank:* ${bankLine}

ඔබගේ bank details save කර ඇත! පහත template එක copy කර, Player ID, Amount සහ Secret Code පමණක් fill කරන්න:`,
    `──────────────────
💳 *Saved Bank:* ${bankLine}

Your bank details are saved! Copy the template below and fill in only your Player ID, Amount, and Secret Code:`,
    lang
  );

  // Reuse the base withdrawal menu then append the saved bank notice + template
  const base = withdrawMenu(lang);
  return `${base}\n\n${savedBankNotice}\n\n${prefilledTemplate}`;
}

function savedBankUpdated(lang = 'si') {
  return _t(
    '💳 ඔබගේ bank details save කළා. ඊළඟ withdrawal ෙල automatically pre-fill වේ.',
    '💳 Your bank details have been saved and will be pre-filled in future withdrawals.',
    lang
  );
}

// ═══════════════════════════════════════════
// BROADCAST
// ═══════════════════════════════════════════
function broadcastResult(sent, failed) {
  return `📢 *Broadcast Complete*

✅ Sent: ${sent}
❌ Failed: ${failed}
👥 Total: ${sent + failed}`;
}

// ═══════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════
function adminHelp() {
  return `👑 ADMIN PANEL

/admin stats
/admin deposits
/admin deposit approve <id>
/admin deposit reject <id>
/admin withdrawals
/admin withdraw approve <id>
/admin withdraw reject <id>
/admin banks
/admin broadcast <message>`;
}

function adminStats(stats) {
  return `👑 *ADMIN PANEL*

👥 Total Users: ${stats.users}
⏳ Pending Deposits: ${stats.pendingDeposits}
⏳ Pending Withdrawals: ${stats.pendingWithdrawals}
🟢 Status: Active`;
}

function adminDepositList(deposits = []) {
  if (!deposits.length) return '✅ No pending deposits.';

  const lines = deposits
    .map(
      (d) =>
        `#${d.id} | ${d.player_id || 'No ID'} | ${d.bank_name || 'Unknown'} | ${
          d.amount_text || 'N/A'
        } | ${d.status}`
    )
    .join('\n');

  return `⏳ Pending Deposits\n\n${lines}`;
}

function adminWithdrawalList(withdrawals = []) {
  if (!withdrawals.length) return '✅ No pending withdrawals.';

  const lines = withdrawals
    .map(
      (w) =>
        `#${w.id} | ${w.player_id} | ${w.amount_text} | ${w.bank_name} | ${w.status}`
    )
    .join('\n');

  return `⏳ Pending Withdrawals\n\n${lines}`;
}

function adminBankList(banks = []) {
  if (!banks.length) return '⚠️ No active bank accounts.';

  const lines = banks
    .map((b) => `${b.sort_key}. ${b.bank_name} — ${b.display_number}`)
    .join('\n');

  return `🏦 Active Banks\n\n${lines}`;
}

function adminNewDeposit(deposit) {
  return `🔔 *New Deposit Request*

🆔 ID: ${deposit.id}
👤 User: ${deposit.user_jid}
📌 Player ID: ${deposit.player_id || 'Pending'}
🏦 Bank: ${deposit.bank_name || 'Unidentified'}
💰 Amount: ${deposit.amount_text || 'Unidentified'}
${deposit.detected_date_time ? `📅 Date/Time: ${deposit.detected_date_time}\n` : ''}${deposit.reference ? `🔖 Txn Ref: ${deposit.reference}\n` : ''}${deposit.sender ? `📤 From: ${deposit.sender}\n` : ''}${deposit.receiver ? `📥 To: ${deposit.receiver}\n` : ''}📊 Status: ${deposit.status}`;
}

function adminNewWithdrawal(withdrawal) {
  return `💸 *New Withdrawal Request*

🆔 ID: ${withdrawal.id}
👤 User: ${withdrawal.user_jid}
📌 Player ID: ${withdrawal.player_id}
💰 Amount: ${withdrawal.amount_text}
🏦 Bank: ${withdrawal.bank_name}
🔢 Account Number: ${withdrawal.account_number}
👤 Account Holder: ${withdrawal.account_holder}
📊 Status: ${withdrawal.status}`;
}

function statusUpdated(type, id, status) {
  return `✅ ${type} #${id} marked as *${status}*.`;
}

function userDepositStatus(deposit, status, lang = 'si') {
  if (status === 'APPROVED') {
    return _t(
      `✅ ඔබගේ deposit request #${deposit.id} *අනුමත* කර ඇත.
ඔබගේ 1xBet ගිණුමට ඉක්මනින් credit කරනු ඇත.

💬 "menu" → ප්‍රධාන menu.`,
      `✅ Your deposit request #${deposit.id} has been *approved*.
Funds will be credited to your 1xBet account shortly.

💬 Send "menu" to return to the main menu.`,
      lang
    );
  }
  return _t(
    `❌ ඔබගේ deposit request #${deposit.id} *ප්‍රතික්ෂේප* කර ඇත.
සහාය සඳහා admin සම්බන්ධ කරගන්න.`,
    `❌ Your deposit request #${deposit.id} was *rejected*.
Please contact support for assistance.`,
    lang
  );
}

function userWithdrawStatus(withdrawal, status, lang = 'si') {
  if (status === 'APPROVED') {
    return _t(
      `✅ ඔබගේ withdrawal request #${withdrawal.id} *අනුමත* කර ඇත.
ඉක්මනින් ඔබගේ බැංකු ගිණුමට transfer කරනු ඇත.

💬 "menu" → ප්‍රධාන menu.`,
      `✅ Your withdrawal request #${withdrawal.id} has been *approved*.
Funds will be transferred to your bank account shortly.

💬 Send "menu" to return to the main menu.`,
      lang
    );
  }
  return _t(
    `❌ ඔබගේ withdrawal request #${withdrawal.id} *ප්‍රතික්ෂේප* කර ඇත.
සහාය සඳහා admin සම්බන්ධ කරගන්න.`,
    `❌ Your withdrawal request #${withdrawal.id} was *rejected*.
Please contact support for assistance.`,
    lang
  );
}

// ═══════════════════════════════════════════
// PRIVACY COMMANDS
// ═══════════════════════════════════════════
function privacyCurrent(pref, lang = 'si') {
  return _t(
    `🔒 දැනට privacy preference: *${pref}*

භාවිතා කරන්න:
.privacy set standard
.privacy set delete`,
    `🔒 Current privacy preference: *${pref}*

Use:
.privacy set standard
.privacy set delete`,
    lang
  );
}

function privacyDeleted(lang = 'si') {
  return _t(
    '✅ ඔබගේ user data මකා දමන ලදී. ඔබ නැවත bot එකට message කළ විට නව profile එකක් සාදනු ඇත.',
    '✅ Your user data has been deleted. If you contact the bot again, a new profile will be created.',
    lang
  );
}

function privacyUpdated(pref, lang = 'si') {
  return _t(
    `✅ Privacy preference *${pref}* ලෙස update කළා.`,
    `✅ Privacy preference updated to *${pref}*.`,
    lang
  );
}

// ═══════════════════════════════════════════
// FLOW / STATE / ERRORS
// ═══════════════════════════════════════════
function accessDenied(lang = 'si') {
  return '❌ Access Denied.';
}

function cancelled(lang = 'si') {
  return _t(
    '❌ ක්‍රියාවලිය අවලංගු කළා. නැවත ආරම්භ කිරීමට "menu" ලෙස එවන්න.',
    '❌ Cancelled. Send "menu" to start again.',
    lang
  );
}

function awaitingSlip(lang = 'si') {
  return _t(
    '📸 කරුණාකර deposit receipt photo / screenshot එක (JPG/PNG) එවන්න. Send "cancel" to exit.',
    '📸 Please send a photo or screenshot (JPG/PNG) of your deposit receipt. Send "cancel" to exit.',
    lang
  );
}

function awaitingPlayerId(depositId, lang = 'si') {
  return _t(
    `📌 කරුණාකර reference #${depositId} සඳහා ඔබගේ 1xBet Player ID (5-12 digit) enter කරන්න.`,
    `📌 Please enter your 1xBet Player ID (5–12 digits) for reference #${depositId}.`,
    lang
  );
}

function unknownInput(lang = 'si') {
  return _t(
    ` Fast Xbet Official AI Support

මට ඔබගේ පණිවිඩය තේරුම් ගත නොහැකි විය. 🤔

කරුණාකර පහත අංකයක් එවන්න:
1️⃣ Cash Deposit
2️⃣ Cash Withdrawal
3️⃣ Registration & Bonus
4️⃣ Daily Tips
5️⃣ Help Center

නැතහොත් "menu" ලෙස එවන්න. 💬`,
    ` Fast Xbet Official AI Support

I could not understand your message. 🤔

Please send a number:
1️⃣ Cash Deposit
2️⃣ Cash Withdrawal
3️⃣ Registration & Bonus
4️⃣ Daily Tips
5️⃣ Help Center

Or type "menu". 💬`,
    lang
  );
}

function rateLimited(lang = 'si') {
  return _t(
    '⚠️ ඉතා වේගයෙන් messages. කරුණාකර මිනිත්තුවක් රැඳෙන්න.',
    '⚠️ Too many messages. Please wait a minute.',
    lang
  );
}

function pdfNotAllowed(lang = 'si') {
  return _t(
    '⚠️ PDF කියවීමට නොහැක. Slip Photo / Screenshot (JPG/PNG) එවන්න.',
    '⚠️ PDFs are not supported. Please send a slip photo or screenshot (JPG/PNG).',
    lang
  );
}

function fileTooLarge(lang = 'si') {
  return _t(
    '⚠️ ඡායාරූපය විශාල වැඩිය. උපරිම ප්‍රමාණය 5MB.',
    '⚠️ Image is too large. Maximum size is 5MB.',
    lang
  );
}

function genericError(lang = 'si') {
  return _t(
    '❌ කණගාටුයි, යම් දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.',
    '❌ Sorry, an error occurred. Please try again.',
    lang
  );
}

function invalidPlayerId(lang = 'si') {
  return _t(
    '⚠️ Invalid Player ID. Digits 5-12 ක් විය යුතුය. නැවත ඇතුළත් කරන්න:',
    '⚠️ Invalid Player ID. It must be 5–12 digits. Please try again:',
    lang
  );
}

function notFound(type, lang = 'si') {
  return `⚠️ ${type} not found.`;
}

// ═══════════════════════════════════════════
module.exports = {
  welcome,
  mainMenu,
  depositMenu,
  bankDetails,
  withdrawMenuWithSavedBank,
  savedBankUpdated,
  broadcastResult,
  processingSlip,
  invalidSlip,
  duplicateSlip,
  crossUserDuplicateAlert,
  askPlayerId,
  depositReceived,
  withdrawMenu,
  withdrawDetailsReceived,
  withdrawFormat,
  withdrawAmountInvalid,
  withdrawReceived,
  registrationInfo,
  tipsInfo,
  helpInfo,
  privacyPolicy,
  langChanged,
  langHelp,
  historyMessage,
  adminHelp,
  adminStats,
  adminDepositList,
  adminWithdrawalList,
  adminBankList,
  adminNewDeposit,
  adminNewWithdrawal,
  statusUpdated,
  userDepositStatus,
  userWithdrawStatus,
  accessDenied,
  cancelled,
  awaitingSlip,
  awaitingPlayerId,
  unknownInput,
  rateLimited,
  pdfNotAllowed,
  fileTooLarge,
  genericError,
  invalidPlayerId,
  notFound,
  privacyCurrent,
  privacyDeleted,
  privacyUpdated
};
