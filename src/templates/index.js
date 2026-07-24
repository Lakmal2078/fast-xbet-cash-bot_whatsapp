const config = require('../config');

// ═══════════════════════════════════════════
// WELCOME / MENU
// ═══════════════════════════════════════════
function welcome() {
  return `🚀 Fast Xbet Official AI Support

1xBet Deposit, Withdrawal ඇතුළු සියලුම සේවාවන් සඳහා අපගේ AI සහායක සම්බන්ධ කරගැනීමට "menu" ලෙස සටහන් කර එවන්න.

💡 Send "menu" anytime to open the main menu.`;
}

function mainMenu() {
  return `🔥 FAST XBET OFFICIAL MAIN MENU 🔥

1️⃣ Cash Deposit
2️⃣ Cash Withdrawal
3️⃣ 1xBet Registration & Bonus
4️⃣ Daily Free Tips
5️⃣ Help Center
6️⃣ Privacy Policy
7️⃣ Admin Panel

Select a service (1-7):
💡 Send "menu" anytime to return here.
💬 Send "cancel" to exit an active flow.`;
}

// ═══════════════════════════════════════════
// DEPOSIT
// ═══════════════════════════════════════════
function depositMenu(banks = []) {
  const lines = banks
    .map((bank) => `${bank.sort_key}️⃣ 🏦 ${bank.bank_name}`)
    .join('\n');

  return `💰 DEPOSIT ACCOUNTS 💰

${lines}

💡 To get the account details you need, send the relevant number.
💡 To return to the main menu, send "menu".
💬 Send "cancel" to exit.`;
}

function bankDetails(bank) {
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

💬 To return to the main menu, send "menu".`;
}

function processingSlip() {
  return '🔍 AI මඟින් Slip එක පරීක්ෂා කරයි... කරුණාකර රැඳෙන්න.';
}

function invalidSlip() {
  return `⚠️ මෙම ඡායාරූපයෙන් ගෙවීම් විස්තර හඳුනාගත නොහැකි විය.

කරුණාකර පහත දේ පැහැදිලිව පෙනෙන photo / screenshot එකක් එවන්න:
• මුදල (Amount)
• බැංකුව (Bank name)
• Transaction reference / receipt number
• දිනය සහ වේලාව (Date/Time)`;
}

function duplicateSlip(depositId) {
  return `⚠️ මෙම slip එක කලින්ම ඉදිරිපත් කර ඇත.
Reference ID: ${depositId}

මෙය වැරදීමක් යැයි ඔබ සිතන්නේ නම්, කරුණාකර support අමතන්න.`;
}

function askPlayerId(deposit) {
  return `✅ *Receipt Detected!*

🆔 Reference: #${deposit.id}
🏦 *Bank:* ${deposit.bank_name || 'Unidentified'}
💰 *Amount:* ${deposit.amount_text || 'Unidentified'}
${deposit.detected_date_time ? `📅 *Date/Time:* ${deposit.detected_date_time}\n` : ''}${deposit.reference ? `🔖 *Txn Ref:* ${deposit.reference}\n` : ''}${deposit.sender ? `📤 *From:* ${deposit.sender}\n` : ''}${deposit.receiver ? `📥 *To:* ${deposit.receiver}\n` : ''}
📌 ඔබගේ *1xBet Player ID* (5-12 digit) enter කරන්න:
💬 Send "cancel" to exit.`;
}

function depositReceived(deposit) {
  return `✅ *DEPOSIT DETAILS CONFIRMED!*

🆔 Reference ID: ${deposit.id}
📌 1xBet Player ID: ${deposit.player_id || 'Pending'}
🏦 Bank: ${deposit.bank_name || 'Unidentified'}
💰 Deposit Amount: ${deposit.amount_text || 'Unidentified'}
${deposit.detected_date_time ? `📅 Date/Time: ${deposit.detected_date_time}\n` : ''}${deposit.reference ? `🔖 Txn Reference: ${deposit.reference}\n` : ''}📊 Status: ${deposit.status}
──────────────────────────

⏳ Your deposit request has been received successfully. Our team will review and process it within *5–15 minutes*. Once verified, the funds will be credited to your 1xBet account.

💬 To return to the main menu, simply type *menu*.`;
}

// ═══════════════════════════════════════════
// WITHDRAWAL (1xBet Cash method)
// ═══════════════════════════════════════════
function withdrawMenu() {
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
⚡ After we receive the above information, your withdrawal will be processed and the funds will be transferred to your bank account within 5–15 minutes.
✅ No service charges or processing fees apply.

💬 If you need any assistance, please select Help Center.
💬 To return to the main menu, send "menu".`;
}

function withdrawDetailsReceived() {
  return `✅ ඔබගේ withdrawal විස්තර ලැබුණා.

අපගේ කණ්ඩායම ඔබගේ ඉල්ලීම පරීක්ෂා කර, මිනිත්තු 5–15ක් ඇතුළත ඔබගේ බැංකු ගිණුමට මුදල් බැර කරනු ඇත.
අවශ්‍ය නම් අපි ඔබව මෙතනින්ම දැනුවත් කරන්නෙමු.

💬 To return to the main menu, send "menu".`;
}

function withdrawFormat() {
  return `⚠️ Format වැරදිය.

භාවිතා කරන්න:
WITHDRAW <PlayerID> <Amount> <BankName> <AccNo> <AccountHolder>

Example:
WITHDRAW 123456 5000 BOC 95645895 Vgs Lakmal`;
}

function withdrawAmountInvalid(min, max) {
  return `⚠️ වලංගු නොවන withdrawal මුදල.
ඉඩ ලබා දී ඇති පරාසය: LKR ${min} - LKR ${max}.`;
}

function withdrawReceived(withdrawal) {
  return `💸 *WITHDRAWAL REQUEST RECEIVED!*

🆔 Reference ID: ${withdrawal.id}
📌 Player ID: ${withdrawal.player_id}
💰 Amount: ${withdrawal.amount_text}
🏦 Bank: ${withdrawal.bank_name}
🔢 Acc No: ${withdrawal.account_number}
📊 Status: ${withdrawal.status}

⏳ Process time: 5–15 minutes.
✅ Admin confirm කළ පසු notify කෙරේ.

💬 To return to the main menu, send "menu".`;
}

// ═══════════════════════════════════════════
// INFO PAGES
// ═══════════════════════════════════════════
function registrationInfo() {
  return `📋 1xBet Registration & Bonus

👉 Register Link:
${config.XBET_LINK}
🎁 Promo Code: ${config.XBET_PROMO_CODE}
━━━━━━━━━━━━━━
✅ Register කරන ආකාරය:
1️⃣ හත link site open කරන්න
2️⃣ "Register" ක්ලික් කරන්න
3️⃣ ඔබගේ details ඇතුළත් කරන්න
4️⃣ Promo Code: ${config.XBET_PROMO_CODE}
5️⃣ Register සම්පූර්ණ කරන්න

🎉 Bonus: ප්‍රම Deposit මත 150% Bonus!`;
}

function tipsInfo() {
  return `⚽ Daily Free Tips

🔥 සෑම දිනකම FREE Tips ලබාගන්න!
📢 Telegram Channel:
${config.CHANNEL_LINK}
━━━━━━━━━━━━━━
1️⃣ හත link open කරන්න
2️⃣ "Join" click කරන්න
3️⃣ Daily tips ලබාගන්න 🎯`;
}

function helpInfo() {
  return `🆘 Help Center
━━━━━━━━━━━━━━
💰 Deposit: Menu → 1 → Bank තෝරා Slip photo
💸 Withdrawal: Menu → 2 → Instructions follow
📋 Registration: Menu → 3 → Promo code use
⚽ Tips: Menu → 4 → Channel join
🔒 Privacy: .privacy set / .privacy get
━━━━━━━━━━━━━━
ගැටළු: Admin Panel → Menu → 7
💡 "menu" → Main Menu`;
}

// ============================================================
// UPDATED PRIVACY POLICY (as requested)
// ============================================================
function privacyPolicy() {
  return `🔒 *PRIVACY POLICY — Fast Xbet Official Sri Lanka*
━━━━━━━━━━━━━━

*1️⃣ එකතු කරන තොරතුරු (Information We Collect)*
අපගේ සේවාව ලබා දීම සඳහා අපි ඔබගෙන් පහත තොරතුරු පමණක් ඉල්ලා සිටින්නෙමු:
• ඔබගේ 1xBet පරිශීලක හැඳුනුම්පත (User ID)
• මුදල් තැන්පත් කළ බව තහවුරු කරන රිසිට්පත් (Deposit Receipts)
• මුදල් ලබා ගැනීම සඳහා අවශ්‍ය වන ආරක්ෂක කේත (Security Codes)
• ඔබගේ බැංකු ගිණුම් විස්තර (මුදල් එවීමට පමණක්)

*2️⃣ තොරතුරු භාවිතා කරන ආකාරය (How We Use Information)*
ඔබ ලබා දෙන තොරතුරු භාවිතා කරනුයේ:
• ඔබගේ 1xBet ගිණුමට මුදල් තැන්පත් කිරීමට
• ඔබ ඉල්ලා සිටින මුදල් ලබා ගැනීම් (Withdrawals) තහවුරු කර ඔබගේ බැංකු ගිණුමට එවීම සඳහා පමණි

*3️⃣ දත්ත ආරක්ෂණය (Data Protection)*
• ඔබගේ කිසිදු පෞද්ගලික තොරතුරක් බාහිර පාර්ශවයන් වෙත විකිණීම හෝ හුවමාරු කිරීම සිදු නොකෙරේ
• සියලුම ගනුදෙනු විස්තර රහසිගතව තබා ගන්නා අතර, සේවාව අවසන් වූ පසු අනවශ්‍ය දත්ත පද්ධතියෙන් ඉවත් කරනු ලැබේ

*4️⃣ වගකීම් සහතිකය (Disclaimer)*
• අප සේවාව ලබා දෙන්නේ තැන්පතු සහ මුදල් ලබා ගැනීම් පහසු කිරීමට පමණි
• 1xBet ආයතනය සමඟ ඇති වන තාක්ෂණික ගැටලු හෝ ක්‍රීඩාවෙන් වන පාඩු සම්බන්ධයෙන් අප වගකීමක් දරනු නොලැබේ
• ඔබගේ 1xBet ගිණුමේ රහස්‍යභාවය සුරැකීම ඔබ සතු වගකීමකි

*5️⃣ අප හා සම්බන්ධ වීමට (Contact Us)*
පෞද්ගලිකත්වය පිළිබඳ කිසියම් ගැටලුවක් ඇත්නම් පහත අංකය හරහා අප හා සම්බන්ධ වන්න:
📞 +94765865387
━━━━━━━━━━━━━━
© 2026 Fast Xbet Official Sri Lanka. All rights reserved.`;
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
/admin banks`;
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

function userDepositStatus(deposit, status) {
  if (status === 'APPROVED') {
    return `✅ Your deposit request #${deposit.id} has been *approved*.
Funds will be credited to your 1xBet account shortly.

💬 To return to the main menu, send "menu".`;
  }
  return `❌ Your deposit request #${deposit.id} was *rejected*.
Please contact support for assistance.`;
}

function userWithdrawStatus(withdrawal, status) {
  if (status === 'APPROVED') {
    return `✅ Your withdrawal request #${withdrawal.id} has been *approved*.
Funds will be transferred to your bank account shortly.

💬 To return to the main menu, send "menu".`;
  }
  return `❌ Your withdrawal request #${withdrawal.id} was *rejected*.
Please contact support for assistance.`;
}

// ═══════════════════════════════════════════
// PRIVACY COMMANDS
// ═══════════════════════════════════════════
function privacyCurrent(pref) {
  return `🔒 Current privacy preference: *${pref}*

Use:
.privacy set standard
.privacy set delete`;
}

function privacyDeleted() {
  return '✅ Your user data has been deleted. If you contact the bot again, a new profile will be created.';
}

function privacyUpdated(pref) {
  return `✅ Privacy preference updated to *${pref}*.`;
}

// ═══════════════════════════════════════════
// FLOW / STATE / ERRORS
// ═══════════════════════════════════════════
function accessDenied() {
  return '❌ Access Denied.';
}

function cancelled() {
  return '❌ ක්‍රියාවලිය අවලංගු කළා. නැවත ආරම්භ කිරීමට "menu" ලෙස එවන්න.';
}

function awaitingSlip() {
  return '📸 කරුණාකර deposit receipt photo / screenshot එක (JPG/PNG) එවන්න. Send "cancel" to exit.';
}

function awaitingPlayerId(depositId) {
  return `📌 කරුණාකර reference #${depositId} සඳහා ඔබගේ 1xBet Player ID (5-12 digit) enter කරන්න.`;
}

function unknownInput() {
  return ` Fast Xbet Official AI Support

මට ඔබගේ පණිවිඩය තේරුම් ගත නොහැකි විය. 🤔

කරුණාකර පහත අංකයක් එවන්න:
1️⃣ Cash Deposit
2️⃣ Cash Withdrawal
3️⃣ Registration & Bonus
4️⃣ Daily Tips
5️⃣ Help Center

නැතහොත් "menu" ලෙස එවන්න. 💬`;
}

function rateLimited() {
  return '⚠️ ඉතා වේගයෙන් messages. කරුණාකර මිනිත්තුවක් රැඳෙන්න.';
}

function pdfNotAllowed() {
  return '⚠️ PDF කියවීමට නොහැක. Slip Photo / Screenshot (JPG/PNG) එවන්න.';
}

function fileTooLarge() {
  return '⚠️ ායාරූපය විශාල වැඩිය. උපරිම ප්‍රමාණය 5MB.';
}

function genericError() {
  return '❌ කණගාටුයි, යම් දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.';
}

function invalidPlayerId() {
  return '⚠️ Invalid Player ID. Digits 5-12 ක් විය යුතුය. නැවත ඇතුළත් කරන්න:';
}

function notFound(type) {
  return `⚠️ ${type} not found.`;
}

// ═══════════════════════════════════════════
module.exports = {
  welcome,
  mainMenu,
  depositMenu,
  bankDetails,
  processingSlip,
  invalidSlip,
  duplicateSlip,
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