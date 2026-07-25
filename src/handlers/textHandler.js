const config = require('../config');
const db = require('../db');
const templates = require('../templates');

const userService = require('../services/userService');
const bankService = require('../services/bankService');
const depositService = require('../services/depositService');
const withdrawService = require('../services/withdrawService');
const adminService = require('../services/adminService');

const { isValidPlayerId, extractBankFromText } = require('../utils/helpers');
const { chatWithAI, detectFrustration } = require('../services/aiService');

const privacyHandler = require('./privacyHandler');
const adminHandler = require('./adminHandler');
const withdrawHandler = require('./withdrawHandler');

async function handleTextMessage(sock, msg, jid, text) {
  const lowerText = text.toLowerCase().trim();

  // ── cancel: හැම flow එකකම ──
  if (lowerText === 'cancel') {
    db.deleteState(jid);
    db.clearChatHistory(jid);
    const lang = userService.getLanguage(jid);
    await sock.sendMessage(jid, { text: templates.cancelled(lang) });
    return;
  }

  // ── menu: state reset + main menu ──
  if (lowerText === 'menu') {
    db.deleteState(jid);
    db.clearChatHistory(jid);
    const lang = userService.getLanguage(jid);
    await sock.sendMessage(jid, { text: templates.mainMenu(lang) });
    return;
  }

  // ── language toggle ──
  if (lowerText.startsWith('lang ')) {
    const arg = lowerText.slice(5).trim();
    let newLang = null;
    if (arg === 'sinhala' || arg === 'si' || arg === 'සිංහල') newLang = 'si';
    else if (arg === 'english' || arg === 'en') newLang = 'en';

    userService.ensureUser(jid);

    if (!newLang) {
      const lang = userService.getLanguage(jid);
      await sock.sendMessage(jid, { text: templates.langHelp(lang) });
      return;
    }

    userService.setLanguage(jid, newLang);
    await sock.sendMessage(jid, { text: templates.langChanged(newLang) });
    return;
  }

  // ── guide command ──
  if (lowerText === 'guide') {
    userService.ensureUser(jid);
    const lang = userService.getLanguage(jid);
    db.setState(jid, {
      step: 'GUIDE_TOPIC',
      expires: Date.now() + 5 * 60 * 1000
    });
    await sock.sendMessage(jid, { text: templates.guideMenu(lang) });
    return;
  }

  // ── history command ──
  if (lowerText === 'history') {
    userService.ensureUser(jid);
    const lang = userService.getLanguage(jid);
    const deposits = depositService.getUserDeposits(jid, 10);
    const withdrawals = withdrawService.getUserWithdrawals(jid, 10);
    await sock.sendMessage(jid, { text: templates.historyMessage(deposits, withdrawals, lang) });
    return;
  }

  // ── legacy WITHDRAW command (staff / testing) ──
  if (text.toUpperCase().startsWith('WITHDRAW ')) {
    await withdrawHandler.handleWithdrawRequest(sock, jid, text);
    return;
  }

  // ── privacy command ──
  if (lowerText.startsWith('.privacy')) {
    const args = text.slice(8).trim().split(/\s+/).filter(Boolean);
    await privacyHandler.handlePrivacyCommand(sock, msg, args);
    return;
  }

  // ── admin command ──
  if (lowerText.startsWith('/admin') || text === '.admin') {
    await adminHandler.handleAdminCommand(sock, msg, jid, text);
    return;
  }

  const state = db.getState(jid);

  // ── GUIDE_TOPIC: user picks which guide section to show ──
  if (state?.step === 'GUIDE_TOPIC') {
    const lang = userService.getLanguage(jid);
    const guideMap = {
      '1': templates.guideDeposit,
      '2': templates.guideWithdraw,
      '3': templates.guideRegistration,
      '4': templates.guideTips,
      '5': templates.guideExtra,
      '6': templates.guideAll
    };
    const guideFn = guideMap[text];
    if (guideFn) {
      db.deleteState(jid);
      if (text === '6') {
        const fullGuide = templates.guideAll(lang);
        const half = Math.floor(fullGuide.length / 2);
        const splitAt = fullGuide.indexOf('\n\n', half);
        const part1 = fullGuide.slice(0, splitAt);
        const part2 = fullGuide.slice(splitAt).trim();
        await sock.sendMessage(jid, { text: part1 });
        await sock.sendMessage(jid, { text: part2 });
      } else {
        await sock.sendMessage(jid, { text: guideFn(lang) });
      }
    } else {
      await sock.sendMessage(jid, { text: templates.guideMenu(lang) });
    }
    return;
  }

  // ── AWAITING_ID: slip එකෙන් පසු Player ID ──
  if (state?.step === 'AWAITING_ID') {
    const lang = userService.getLanguage(jid);
    if (!isValidPlayerId(text)) {
      await sock.sendMessage(jid, { text: templates.invalidPlayerId(lang) });
      return;
    }

    const deposit = depositService.getDeposit(state.depositId);
    if (!deposit) {
      db.deleteState(jid);
      await sock.sendMessage(jid, { text: templates.genericError(lang) });
      return;
    }

    depositService.setPlayerId(deposit.id, text);
    const updated = depositService.getDeposit(deposit.id);
    db.deleteState(jid);

    await adminService.notifyAdmins(sock, templates.adminNewDeposit(updated));
    await sock.sendMessage(jid, { text: templates.depositReceived(updated, lang) });
    return;
  }

  // ── SELECT_BANK: bank අංකය (deposit menu) ──
  if (state?.step === 'SELECT_BANK') {
    const lang = userService.getLanguage(jid);
    const sortKey = Number(text);
    const bank = Number.isNaN(sortKey) ? null : bankService.getBankBySort(sortKey);

    if (!bank) {
      const banks = bankService.getActiveBanks();
      await sock.sendMessage(jid, { text: templates.depositMenu(banks, lang) });
      return;
    }

    db.setState(jid, {
      step: 'AWAITING_SLIP',
      selectedBankId: bank.id,
      selectedBankName: bank.bank_name,
      expires: Date.now() + config.AWAITING_SLIP_TIMEOUT_MS
    });

    await sock.sendMessage(jid, { text: templates.bankDetails(bank, lang) });
    return;
  }

  // ── AWAITING_SLIP: text එකක් ආවොත් slip ඉල්ලන්න ──
  if (state?.step === 'AWAITING_SLIP') {
    const lang = userService.getLanguage(jid);
    await sock.sendMessage(jid, { text: templates.awaitingSlip(lang) });
    return;
  }

  // ── AWAITING_WITHDRAW: customer එවන withdrawal විස්තර admin ට forward ──
  if (state?.step === 'AWAITING_WITHDRAW') {
    const lang = userService.getLanguage(jid);
    const details = text;
    const idMatch = details.match(/\b(\d{5,12})\b/);
    const label = idMatch ? ` (Player ID: ${idMatch[1]})` : '';

    const adminText =
      `💸 *New Withdrawal Request*${label}\n` +
      `👤 From: ${jid}\n` +
      `────────────────────\n` +
      details;

    await adminService.notifyAdmins(sock, adminText);

    const bankDetails = extractBankFromText(details);
    if (bankDetails) {
      userService.saveBank(jid, bankDetails);
    }

    db.deleteState(jid);
    await sock.sendMessage(jid, { text: templates.withdrawDetailsReceived(lang) });
    return;
  }

  // ── Ensure user exists in DB ──
  userService.ensureUser(jid);
  const lang = userService.getLanguage(jid);

  // ── Send welcome if first time or 24h have passed ──
  if (userService.shouldSendWelcome(jid)) {
    userService.recordWelcomeSent(jid);
    await sock.sendMessage(jid, { text: templates.welcome(lang) });
    return;
  }

  // ── Main menu options ──
  switch (text) {
    case '1': {
      const banks = bankService.getActiveBanks();
      db.setState(jid, {
        step: 'SELECT_BANK',
        expires: Date.now() + config.SELECT_BANK_TIMEOUT_MS
      });
      // ⚠️ Auto scam warning — sent first, then the bank list
      await sock.sendMessage(jid, { text: templates.scamWarning(lang) });
      await sock.sendMessage(jid, { text: templates.depositMenu(banks, lang) });
      return;
    }

    case '2': {
      db.setState(jid, {
        step: 'AWAITING_WITHDRAW',
        expires: Date.now() + config.AWAITING_SLIP_TIMEOUT_MS
      });
      const savedBank = userService.getSavedBank(jid);
      const withdrawText = savedBank
        ? templates.withdrawMenuWithSavedBank(savedBank, lang)
        : templates.withdrawMenu(lang);
      await sock.sendMessage(jid, { text: withdrawText });
      return;
    }

    case '3':
      await sock.sendMessage(jid, { text: templates.registrationInfo(lang) });
      return;

    case '4':
      await sock.sendMessage(jid, { text: templates.tipsInfo(lang) });
      return;

    case '5':
      await sock.sendMessage(jid, { text: templates.helpInfo(lang) });
      return;

    case '6':
      await sock.sendMessage(jid, { text: templates.privacyPolicy(lang) });
      return;

    case '7':
      await adminHandler.handleAdminCommand(sock, msg, jid, '/admin stats');
      return;

    default: {
      // ── Frustration / sentiment check before calling AI ──
      if (detectFrustration(text)) {
        const calmMsg = lang === 'en'
          ? `I completely understand your frustration and I'm sorry for the inconvenience 🙏 Our team is looking into this. Please send "7" to reach an admin directly — they can resolve this for you right away.`
          : `ඔබගේ කනගාටුව අපට සම්පූර්ණයෙන්ම තේරෙනවා, ඒ ගැන ඉතා කණගාටුයි 🙏 අපගේ කණ්ඩායම මෙය ඉක්මනින් සලකා බලයි. "7" ලෙස send කර admin කෙනෙකු සමඟ සෘජුවම කතා කරන්න — ඔවුන් ඔබගේ ගැටලුව ඉවත් කරනු ඇත.`;

        await sock.sendMessage(jid, { text: calmMsg });

        // URGENT alert to admin
        const urgentAlert =
          `🚨 *URGENT — Frustrated Customer*\n` +
          `👤 JID: ${jid}\n` +
          `💬 Message: "${text}"\n` +
          `⚡ Please respond immediately.`;
        await adminService.notifyAdmins(sock, urgentAlert);
        return;
      }

      // ── Pass to AI with conversation history for context ──
      const history = db.getChatHistory(jid, 6);
      const aiReply = await chatWithAI(text, history, lang);
      if (aiReply) {
        // Persist this exchange so next message has context
        db.addChatHistory(jid, 'user', text);
        db.addChatHistory(jid, 'assistant', aiReply);
        await sock.sendMessage(jid, { text: aiReply });
      }
      break;
    }
  }
}

module.exports = { handleTextMessage };
