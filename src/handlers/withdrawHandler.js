const config = require('../config');
const templates = require('../templates');
const withdrawService = require('../services/withdrawService');
const adminService = require('../services/adminService');
const { withdrawSchema, normalizeAmount } = require('../utils/helpers');

async function handleWithdrawRequest(sock, jid, text) {
  const parts = text.trim().split(/\s+/);

  if (parts.length < 6) {
    await sock.sendMessage(jid, {
      text: templates.withdrawFormat()
    });
    return;
  }

  const [, playerId, amountRaw, bankName, accountNumber, ...holderParts] = parts;
  const accountHolder = holderParts.join(' ');

  const parsed = withdrawSchema.safeParse({
    playerId,
    amountRaw,
    bankName,
    accountNumber,
    accountHolder
  });

  if (!parsed.success) {
    await sock.sendMessage(jid, {
      text: templates.withdrawFormat()
    });
    return;
  }

  const amount = normalizeAmount(parsed.data.amountRaw);

  if (
    !amount ||
    amount < config.MIN_WITHDRAW_LKR ||
    amount > config.MAX_WITHDRAW_LKR
  ) {
    await sock.sendMessage(jid, {
      text: templates.withdrawAmountInvalid(
        config.MIN_WITHDRAW_LKR,
        config.MAX_WITHDRAW_LKR
      )
    });
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

  await adminService.notifyAdmins(
    sock,
    templates.adminNewWithdrawal(withdrawal)
  );

  await sock.sendMessage(jid, {
    text: templates.withdrawReceived(withdrawal)
  });
}

module.exports = {
  handleWithdrawRequest
};