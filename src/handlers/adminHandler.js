const logger = require('../utils/logger');
const templates = require('../templates');

const adminService = require('../services/adminService');
const depositService = require('../services/depositService');
const withdrawService = require('../services/withdrawService');
const bankService = require('../services/bankService');

const BROADCAST_DELAY_MS = 300; // avoid WhatsApp rate-limiting

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

    if (command === 'deposit' && subCommand === 'delete' && idRaw) {
      const id = Number(idRaw);
      const deposit = depositService.getDeposit(id);

      if (!deposit) {
        await sock.sendMessage(jid, { text: templates.notFound('Deposit') });
        return;
      }

      depositService.softDeleteDeposit(id);
      adminService.logAction(jid, 'deposit_delete', String(id), deposit.player_id || '');

      await sock.sendMessage(jid, {
        text: `🗑️ Deposit #${id} soft-deleted (hidden from lists; record preserved for audit).`
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
      // Everything after the ID is treated as the rejection reason
      const reason = args.slice(3).join(' ').trim() || null;

      depositService.setStatus(id, status, reason);
      adminService.logAction(jid, `deposit_${subCommand}`, String(id),
        reason ? `${deposit.player_id || ''} | reason: ${reason}` : deposit.player_id || '');

      await sock
        .sendMessage(deposit.user_jid, {
          text: templates.userDepositStatus(deposit, status, reason)
        })
        .catch(() => {});

      await sock.sendMessage(jid, {
        text: templates.statusUpdated('Deposit', id, status, reason)
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

      // Everything after the ID is treated as reason (reject) or payout reference (approve)
      const extra = args.slice(3).join(' ').trim() || null;

      if (subCommand === 'reject') {
        withdrawService.setRejectionReason(id, extra);
      } else {
        // approve: optionally record the payout bank reference
        if (extra) {
          withdrawService.updatePayoutDetails(id, extra, jid);
        } else {
          withdrawService.setStatus(id, 'APPROVED');
        }
      }

      const status = subCommand === 'approve'
        ? (extra ? 'COMPLETED' : 'APPROVED')
        : 'REJECTED';

      adminService.logAction(
        jid,
        `withdraw_${subCommand}`,
        String(id),
        extra ? `${withdrawal.player_id} | ${extra}` : withdrawal.player_id
      );

      const updatedWithdrawal = withdrawService.getWithdrawal(id);
      await sock
        .sendMessage(withdrawal.user_jid, {
          text: templates.userWithdrawStatus(updatedWithdrawal, status, extra)
        })
        .catch(() => {});

      await sock.sendMessage(jid, {
        text: templates.statusUpdated('Withdrawal', id, status, extra)
      });
      return;
    }

    if (command === 'broadcast') {
      const message = args.slice(1).join(' ').trim();
      if (!message) {
        await sock.sendMessage(jid, {
          text: '⚠️ Usage: /admin broadcast <message>'
        });
        return;
      }

      const userJids = adminService.getAllUserJids();
      let sent = 0;
      let failed = 0;

      for (const userJid of userJids) {
        try {
          await sock.sendMessage(userJid, { text: message });
          sent++;
        } catch (e) {
          failed++;
          logger.warn({ err: e.message, userJid }, 'broadcast send failed');
        }
        // Small delay per message to avoid WhatsApp rate-limiting
        await new Promise((r) => setTimeout(r, BROADCAST_DELAY_MS));
      }

      adminService.logAction(jid, 'broadcast', String(userJids.length), message.slice(0, 120));
      await sock.sendMessage(jid, { text: templates.broadcastResult(sent, failed) });
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