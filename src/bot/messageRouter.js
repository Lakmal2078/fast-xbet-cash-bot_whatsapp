const logger = require('../utils/logger');
const templates = require('../templates');

const { isRateLimited } = require('../middleware/rateLimiter');
const textHandler = require('../handlers/textHandler');
const imageHandler = require('../handlers/imageHandler');

/**
 * Extract the plain text from any supported WhatsApp message type.
 * Returns an empty string when no readable text is found.
 */
function extractText(message) {
  if (!message) return '';

  // Standard text
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

  // Button / interactive replies — use display text so handlers see the label
  if (message.buttonsResponseMessage) {
    return (
      message.buttonsResponseMessage.selectedDisplayText ||
      message.buttonsResponseMessage.selectedButtonId ||
      ''
    );
  }
  if (message.templateButtonReplyMessage) {
    return (
      message.templateButtonReplyMessage.selectedDisplayText ||
      message.templateButtonReplyMessage.selectedId ||
      ''
    );
  }
  if (message.listResponseMessage) {
    return (
      message.listResponseMessage.title ||
      message.listResponseMessage.singleSelectReply?.selectedRowId ||
      ''
    );
  }

  return '';
}

/**
 * Returns true for JID types the bot should never respond to:
 *   @g.us        — group chats
 *   @broadcast   — WhatsApp broadcast lists / status
 *   @lid         — phone-number-masked contacts
 *   @newsletter  — WhatsApp channel posts
 */
function shouldIgnoreJid(jid) {
  if (!jid) return true;
  return (
    jid.endsWith('@g.us') ||
    jid.endsWith('@broadcast') ||
    jid.endsWith('@lid') ||
    jid.endsWith('@newsletter')
  );
}

function registerMessageHandler(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (shouldIgnoreJid(jid)) continue;

        // ── Rate limiting ───────────────────────────────────────────────────
        const limited = isRateLimited(jid);
        if (limited === 'warn') {
          await sock.sendMessage(jid, { text: templates.rateLimited() });
          continue;
        }
        if (limited === 'silent') continue;

        // ── View-once images: respect privacy, never process ────────────────
        // They arrive either wrapped in viewOnceMessage or with the flag set.
        if (
          msg.message.viewOnceMessage ||
          msg.message.viewOnceMessageV2 ||
          msg.message.imageMessage?.viewOnce
        ) {
          continue;
        }

        // ── Document / PDF ──────────────────────────────────────────────────
        if (msg.message.documentMessage) {
          await sock.sendMessage(jid, { text: templates.pdfNotAllowed() });
          continue;
        }

        // ── Image ───────────────────────────────────────────────────────────
        if (msg.message.imageMessage) {
          await imageHandler.handleImageMessage(sock, msg, jid);
          continue;
        }

        // ── Text (all varieties) ────────────────────────────────────────────
        const text = extractText(msg.message).trim();
        if (!text) continue;

        await textHandler.handleTextMessage(sock, msg, jid, text);
      } catch (error) {
        logger.error(
          {
            err: error.message,
            stack: error.stack,
            jid: msg.key?.remoteJid
          },
          'Message processing failed'
        );

        if (msg.key?.remoteJid) {
          await sock
            .sendMessage(msg.key.remoteJid, { text: templates.genericError() })
            .catch(() => {});
        }
      }
    }
  });
}

module.exports = { registerMessageHandler };
