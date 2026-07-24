const logger = require('../utils/logger');
const templates = require('../templates');

const adminService = require('../services/adminService');
const depositService = require('../services/depositService');
const withdrawService = require('../services/withdrawService');
const bankService = require('../services/bankService');

async function handleAdminCommand(sock, msg, jid, text) {
  if (!adminService.isAdmin(jid)) {
    await sock.sendMessage(jid, {
      text: templates.accessDenied()
    });
    return;
  }

  const args = text.trim().split(/\s+/).slice(1);
  const [command, subCommand, idRaw] = args;

  try {
    if (!command || command === 'stats') {
      const stats = adminService.getStats();
      adminService.logAction(jid, 'stats');

      await sock.sendMessage(jid, {
        text: templates.adminStats(stats)
      });
      return;
    }

    if (command === 'deposits') {
      const deposits = depositService.getPendingDeposits(10);

      await sock.sendMessage(jid, {
        text: templates.adminDepositList(deposits)
      });
      return;
    }

    if (command === 'withdrawals') {
      const withdrawals = withdrawService.getPendingWithdrawals(10);

      await sock.sendMessage(jid, {
        text: templates.adminWithdrawalList(withdrawals)
      });
      return;
    }

    if (command === 'banks') {
      const banks = bankService.getActiveBanks();

      await sock.sendMessage(jid, {
        text: templates.adminBankList(banks)
      });
      return;
    }

    if (
      command === 'deposit' &&
      (subCommand === 'approve' || subCommand === 'reject') &&
      idRaw
    ) {
      const id = Number(idRaw);
      const deposit = depositService.getDeposit(id);

      if (!deposit) {
        await sock.sendMessage(jid, {
          text: templates.notFound('Deposit')
        });
        return;
      }

      const status = subCommand === 'approve' ? 'APPROVED' : 'REJECTED';

      depositService.setStatus(id, status);
      adminService.logAction(jid, `deposit_${subCommand}`, String(id), deposit.player_id || '');

      await sock
        .sendMessage(deposit.user_jid, {
          text: templates.userDepositStatus(deposit, status)
        })
        .catch(() => {});

      await sock.sendMessage(jid, {
        text: templates.statusUpdated('Deposit', id, status)
      });
      return;
    }

    if (
      command === 'withdraw' &&
      (subCommand === 'approve' || subCommand === 'reject') &&
      idRaw
    ) {
      const id = Number(idRaw);
      const withdrawal = withdrawService.getWithdrawal(id);

      if (!withdrawal) {
        await sock.sendMessage(jid, {
          text: templates.notFound('Withdrawal')
        });
        return;
      }

      const status = subCommand === 'approve' ? 'APPROVED' : 'REJECTED';

      withdrawService.setStatus(id, status);
      adminService.logAction(
        jid,
        `withdraw_${subCommand}`,
        String(id),
        withdrawal.player_id
      );

      await sock
        .sendMessage(withdrawal.user_jid, {
          text: templates.userWithdrawStatus(withdrawal, status)
        })
        .catch(() => {});

      await sock.sendMessage(jid, {
        text: templates.statusUpdated('Withdrawal', id, status)
      });
      return;
    }

    await sock.sendMessage(jid, {
      text: templates.adminHelp()
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Admin command failed');

    await sock.sendMessage(jid, {
      text: templates.genericError()
    });
  }
}

module.exports = {
  handleAdminCommand
};