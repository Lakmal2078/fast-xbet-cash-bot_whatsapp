const config = require('../config');
const templates = require('../templates');
const withdrawService = require('../services/withdrawService');
const adminService = require('../services/adminService');
const userService = require('../services/userService');
const { withdrawSchema, normalizeAmount } = require('../utils/helpers');

async function handleWithdrawRequest(sock, jid, text) {
  try {
    const lang = userService.getLanguage(jid);
    const parts = text.trim().split(/\s+/);

    // Minimum tokens: WITHDRAW playerId amount <at least one for accNo>
    if (parts.length < 4) {
      await sock.sendMessage(jid, { text: templates.withdrawFormat() });
      return;
    }

    // ── Robust parsing: account number is the first all-digit token after
    //    [0]=WITHDRAW [1]=playerId [2]=amount — everything before it is the
    //    bank name (which may contain spaces), everything after is the holder.
    //
    //    Example:
    //      WITHDRAW 123456 5000 Bank of Ceylon 95645895 Nimal Perera
    //      bodyParts = ['Bank', 'of', 'Ceylon', '95645895', 'Nimal', 'Perera']
    //      accNumIdx = 3  →  bankName='Bank of Ceylon', accNo='95645895', holder='Nimal Perera'
    // ──────────────────────────────────────────────────────────────────────────
    const playerId = parts[1];
    const amountRaw = parts[2];
    const bodyParts = parts.slice(3); // everything after WITHDRAW playerId amount

    const accNumIdx = bodyParts.findIndex((p) => /^\d+$/.test(p));
    if (accNumIdx === -1) {
      // No purely-numeric token found → cannot identify account number
      await sock.sendMessage(jid, { text: templates.withdrawFormat() });
      return;
    }

    const bankName = bodyParts.slice(0, accNumIdx).join(' ') || 'Unknown';
    const accountNumber = bodyParts[accNumIdx];
    const accountHolder = bodyParts.slice(accNumIdx + 1).join(' ');

    const parsed = withdrawSchema.safeParse({
      playerId,
      amountRaw,
      bankName,
      accountNumber,
      accountHolder
    });

    if (!parsed.success) {
      await sock.sendMessage(jid, { text: templates.withdrawFormat() });
      return;
    }

    const amount = normalizeAmount(parsed.data.amountRaw);

    if (!amount || amount < config.MIN_WITHDRAW_LKR || amount > config.MAX_WITHDRAW_LKR) {
      await sock.sendMessage(jid, {
        text: templates.withdrawAmountInvalid(config.MIN_WITHDRAW_LKR, config.MAX_WITHDRAW_LKR)
      });
      return;
    }

    // ── Spam guard: block if user already has a PENDING request ──
    const existing = withdrawService.getPendingWithdrawalForUser(jid);
    if (existing) {
      await sock.sendMessage(jid, { text: templates.withdrawPendingExists(existing, lang) });
      return;
    }

    const withdrawalId = withdrawService.createWithdrawal({
      userJid: jid,
      playerId: parsed.data.playerId,
      amount,
      amountText: parsed.data.amountRaw,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountHolder: parsed.data.accountHolder
    });

    const withdrawal = withdrawService.getWithdrawal(withdrawalId);

    await adminService.notifyAdmins(sock, templates.adminNewWithdrawal(withdrawal));
    await sock.sendMessage(jid, { text: templates.withdrawReceived(withdrawal) });

  } catch (err) {
    const logger = require('../utils/logger');
    logger.error({ err: err.message, stack: err.stack }, 'withdrawHandler unexpected error');
    await sock
      .sendMessage(jid, { text: '❌ Withdrawal request processing failed. Please try again or contact admin (send "7").' })
      .catch(() => {});
  }
}

module.exports = {
  handleWithdrawRequest
};