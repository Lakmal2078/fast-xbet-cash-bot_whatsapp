const config = require('../config');
const db = require('../db');
const templates = require('../templates');

const userService = require('../services/userService');
const bankService = require('../services/bankService');
const depositService = require('../services/depositService');
const adminService = require('../services/adminService');

const { isValidPlayerId } = require('../utils/helpers');

const privacyHandler = require('./privacyHandler');
const adminHandler = require('./adminHandler');
const withdrawHandler = require('./withdrawHandler');

async function handleTextMessage(sock, msg, jid, text) {
  const lowerText = text.toLowerCase();

  // ── cancel: හැම flow එකකම ──
  if (lowerText === 'cancel') {
    db.deleteState(jid);
    await sock.sendMessage(jid, { text: templates.cancelled() });
    return;
  }

  // ── menu: state reset + main menu ──
  if (lowerText === 'menu') {
    db.deleteState(jid);
    await sock.sendMessage(jid, { text: templates.mainMenu() });
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

  // ── AWAITING_ID: slip එකෙන් පසු Player ID ──
  if (state?.step === 'AWAITING_ID') {
    if (!isValidPlayerId(text)) {
      await sock.sendMessage(jid, { text: templates.invalidPlayerId() });
      return;
    }

    const deposit = depositService.getDeposit(state.depositId);
    if (!deposit) {
      db.deleteState(jid);
      await sock.sendMessage(jid, { text: templates.genericError() });
      return;
    }

    depositService.setPlayerId(deposit.id, text);
    const updated = depositService.getDeposit(deposit.id);
    db.deleteState(jid);

    await adminService.notifyAdmins(sock, templates.adminNewDeposit(updated));
    await sock.sendMessage(jid, { text: templates.depositReceived(updated) });
    return;
  }

  // ── SELECT_BANK: bank අංකය (deposit menu) ──
  if (state?.step === 'SELECT_BANK') {
    const sortKey = Number(text);
    const bank = Number.isNaN(sortKey) ? null : bankService.getBankBySort(sortKey);

    if (!bank) {
      const banks = bankService.getActiveBanks();
      await sock.sendMessage(jid, { text: templates.depositMenu(banks) });
      return;
    }

    db.setState(jid, {
      step: 'AWAITING_SLIP',
      selectedBankId: bank.id,
      selectedBankName: bank.bank_name,
      expires: Date.now() + config.AWAITING_SLIP_TIMEOUT_MS
    });

    await sock.sendMessage(jid, { text: templates.bankDetails(bank) });
    return;
  }

  // ── AWAITING_SLIP: text එකක් ආවොත් slip ඉල්ලන්න ──
  if (state?.step === 'AWAITING_SLIP') {
    await sock.sendMessage(jid, { text: templates.awaitingSlip() });
    return;
  }

  // ── AWAITING_WITHDRAW: customer එවන withdrawal විස්තර admin ට forward ──
  if (state?.step === 'AWAITING_WITHDRAW') {
    const details = text;
    const idMatch = details.match(/\b(\d{5,12})\b/);
    const label = idMatch ? ` (Player ID: ${idMatch[1]})` : '';

    const adminText =
      `💸 *New Withdrawal Request*${label}\n` +
      `👤 From: ${jid}\n` +
      `────────────────────\n` +
      details;

    await adminService.notifyAdmins(sock, adminText);
    db.deleteState(jid);

    await sock.sendMessage(jid, { text: templates.withdrawDetailsReceived() });
    return;
  }

  // ── Ensure user exists in DB ──
  userService.ensureUser(jid);

  // ── Send welcome if first time or 24h have passed ──
  if (userService.shouldSendWelcome(jid)) {
    userService.recordWelcomeSent(jid);
    await sock.sendMessage(jid, { text: templates.welcome() });
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
      await sock.sendMessage(jid, { text: templates.depositMenu(banks) });
      return;
    }

    case '2':
      db.setState(jid, {
        step: 'AWAITING_WITHDRAW',
        expires: Date.now() + config.AWAITING_SLIP_TIMEOUT_MS
      });
      await sock.sendMessage(jid, { text: templates.withdrawMenu() });
      return;

    case '3':
      await sock.sendMessage(jid, { text: templates.registrationInfo() });
      return;

    case '4':
      await sock.sendMessage(jid, { text: templates.tipsInfo() });
      return;

    case '5':
      await sock.sendMessage(jid, { text: templates.helpInfo() });
      return;

    case '6':
      await sock.sendMessage(jid, { text: templates.privacyPolicy() });
      return;

    case '7':
      await adminHandler.handleAdminCommand(sock, msg, jid, '/admin stats');
      return;

    default:
      // Unrecognised input outside any active flow — stay silent (normal chat behaviour).
      break;
  }
}

module.exports = { handleTextMessage };