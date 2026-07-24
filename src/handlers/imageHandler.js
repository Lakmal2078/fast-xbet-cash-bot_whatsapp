const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');
const templates = require('../templates');

const aiService = require('../services/aiService');
const adminService = require('../services/adminService');
const depositService = require('../services/depositService');
const bankService = require('../services/bankService');
const userService = require('../services/userService');

const { sha256Buffer, normalizeAmount, isValidPlayerId } = require('../utils/helpers');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// ── Admin ට image + details forward කරන්න ──
async function notifyAdminsWithImage(sock, deposit, imageBuffer) {
  const text = templates.adminNewDeposit(deposit);
  const adminIds = config.ADMIN_IDS || [];

  for (const adminId of adminIds) {
    const ajid = `${adminId}@s.whatsapp.net`;
    try {
      if (imageBuffer && imageBuffer.length) {
        await sock.sendMessage(ajid, { image: imageBuffer, caption: text });
      } else {
        await sock.sendMessage(ajid, { text });
      }
    } catch (e) {
      logger.warn({ err: e.message, adminId }, 'admin notify failed');
    }
  }
}

async function handleImageMessage(sock, msg, jid) {
  try {
    const state = db.getState(jid);

    // ── Withdrawal flow එකේදී image එකක් (approval screenshot) ──
    if (state?.step === 'AWAITING_WITHDRAW') {
      let buf = Buffer.alloc(0);
      try {
        const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
        for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
      } catch (e) {
        logger.warn({ err: e.message }, 'withdrawal proof image download failed');
      }

      const caption = (msg.message.imageMessage.caption || '').trim();
      const note =
        `💸 *Withdrawal proof image*\n👤 From: ${jid}` +
        (caption ? `\n📝 Caption: ${caption}` : '');

      const adminIds = config.ADMIN_IDS || [];
      for (const a of adminIds) {
        const ajid = `${a}@s.whatsapp.net`;
        try {
          if (buf.length) await sock.sendMessage(ajid, { image: buf, caption: note });
          else await sock.sendMessage(ajid, { text: note });
        } catch (e) {
          logger.warn({ err: e.message, a }, 'admin withdraw-image notify failed');
        }
      }

      await sock.sendMessage(jid, {
        text:
          '📎 ඔබගේ ඡායාරූපය අපගේ කණ්ඩායමට withdrawal proof එකක් ලෙස යවා ඇත.\n\n' +
          'දැන් කරුණාකර විස්තර text එකක් ලෙසත් එවන්න (Player ID, Amount, Secret Code, Bank Details).\n' +
          'Send "cancel" to exit.'
      });
      return;
    }

    // ── AWAITING_ID: image එකක් ආවොත් Player ID ඉල්ලන්න ──
    if (state?.step === 'AWAITING_ID') {
      await sock.sendMessage(jid, { text: templates.awaitingPlayerId(state.depositId) });
      return;
    }

    // ── SELECT_BANK: image එකක් ආවොත් bank menu එක නැවත ──
    if (state?.step === 'SELECT_BANK') {
      const banks = bankService.getActiveBanks();
      await sock.sendMessage(jid, { text: templates.depositMenu(banks) });
      return;
    }

    // ── Caption එකේ Player ID ──
    const caption = (msg.message.imageMessage.caption || '').trim();
    const captionIdMatch = caption.match(/\b(\d{5,12})\b/);
    const captionPlayerId = captionIdMatch ? captionIdMatch[1] : null;

    await sock.sendMessage(jid, { text: templates.processingSlip() });

    // ── Image download ──
    let buffer = Buffer.alloc(0);
    try {
      const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    } catch (e) {
      logger.error({ err: e.message }, 'Image download failed');
      await sock.sendMessage(jid, { text: '❌ Slip download error. නැවත Slip photo එවන්න.' });
      return;
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      await sock.sendMessage(jid, { text: templates.fileTooLarge() });
      return;
    }

    const imageHash = sha256Buffer(buffer);

    const lang = userService.getLanguage(jid);

    // ── Exact image hash duplicate check (same image, any user) ──
    const existing = depositService.findByImageHash(imageHash);
    if (existing) {
      await sock.sendMessage(jid, { text: templates.duplicateSlip(existing.id, lang) });
      return;
    }

    // ── AI analyze (fail වුණත් empty return, crash නෑ) ──
    const aiData = await aiService.analyzeSlipImage(buffer.toString('base64'));

    const amount = normalizeAmount(aiData.amount);
    const amountText = aiData.amount || 'Unidentified';
    const selectedBankName = state?.selectedBankName || null;
    const bankName =
      aiData.bank_name && aiData.bank_name !== 'null'
        ? aiData.bank_name
        : selectedBankName || 'Unidentified';
    const reference = aiData.reference || null;

    // ── Cross-user reference duplicate check ──
    // Same transaction reference submitted by a different user → flag for admin
    const crossUserDup = depositService.findByReference(reference, jid);
    const hasCrossUserDup = !!(reference && crossUserDup);

    // ── NEVER REJECT: status තීරණය ──
    const aiFound = !!(
      amount ||
      reference ||
      (aiData.bank_name && aiData.bank_name !== 'null') ||
      aiData.is_payment_related
    );

    let status;
    if (hasCrossUserDup) {
      // Potential fraud — always send for manual review
      status = 'MANUAL_REVIEW';
    } else if (aiFound && amount && amount >= config.MIN_DEPOSIT_LKR && amount <= config.MAX_DEPOSIT_LKR) {
      status = 'AI_REVIEW';
    } else {
      status = 'MANUAL_REVIEW'; // AI කියවුණේ නැත්නම් / range පිට නම් → admin manually
    }

    // ── Record හදන්න (safe) ──
    const depositId = depositService.createDeposit({
      userJid: jid,
      bankName,
      amount,
      amountText,
      detectedDateTime: aiData.date_time || null,
      reference,
      sender: aiData.sender || null,
      receiver: aiData.receiver || null,
      imageHash,
      aiResult: aiData,
      status
    });

    const deposit = depositService.getDeposit(depositId);

    // ── Cross-user duplicate → alert admin ──
    if (hasCrossUserDup) {
      const freshDeposit = depositService.getDeposit(depositId);
      await adminService.notifyAdmins(
        sock,
        templates.crossUserDuplicateAlert(crossUserDup, freshDeposit)
      );
    }

    // ── Caption ID තියෙනවා නම් → confirm + admin ට image+details ──
    if (captionPlayerId && isValidPlayerId(captionPlayerId)) {
      depositService.setPlayerId(depositId, captionPlayerId);
      const finalDeposit = depositService.getDeposit(depositId);
      db.deleteState(jid);
      await notifyAdminsWithImage(sock, finalDeposit, buffer);
      await sock.sendMessage(jid, { text: templates.depositReceived(finalDeposit, lang) });
      return;
    }

    // ── Caption ID නෑ → admin image+details, user ගෙන් Player ID ──
    await notifyAdminsWithImage(sock, deposit, buffer);

    db.setState(jid, {
      step: 'AWAITING_ID',
      depositId,
      expires: Date.now() + config.AWAITING_ID_TIMEOUT_MS
    });

    // AI කියවුණේ නැත්නම් gentle notice (REJECT නෙවෙයි!)
    if (!aiFound) {
      const manualMsg = lang === 'en'
        ? `✅ Receipt photo received and saved (Ref #${deposit.id}).\n\nOur AI could not read this image automatically — our team will review it manually. The slip has already been sent to admin.\n\n📌 Please enter your *1xBet Player ID* (5–12 digits):\n💬 Send "cancel" to exit.`
        : `✅ Receipt photo received and saved (Ref #${deposit.id}).\n\nඅපගේ AI එකට මෙම ඡායාරූපය ස්වයංක්‍රීයව කියවීමට නොහැකි විය, එබැවින් අපගේ කණ්ඩායම එය manually පරීක්ෂා කරනු ඇත. Slip එක දැනටමත් admin වෙත යවා ඇත.\n\n📌 දැන් ඔබගේ *1xBet Player ID* (5-12 digit) enter කරන්න:\n💬 Send "cancel" to exit.`;
      await sock.sendMessage(jid, { text: manualMsg });
      return;
    }

    await sock.sendMessage(jid, { text: templates.askPlayerId(deposit, lang) });
  } catch (err) {
    // ── කොහොමහරි යමක් throw වුණත් crash නෑ ──
    logger.error({ err: err.message, stack: err.stack }, 'imageHandler unexpected error');
    await sock
      .sendMessage(jid, {
        text:
          'අපි ඔබගේ ඡායාරූපය ලබා ගත්තෙමු, නමුත් එය ස්වයංක්‍රීයව process කළ නොහැක. ' +
          'කරුණාකර "menu" එවා නැවත උත්සාහ කරන්න, නැතහොත් support අමතන්න.'
      })
      .catch(() => {});
  }
}

module.exports = { handleImageMessage };