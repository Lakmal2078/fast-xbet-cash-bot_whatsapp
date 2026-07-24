const logger = require('../utils/logger');
const templates = require('../templates');

const { isRateLimited } = require('../middleware/rateLimiter');
const textHandler = require('../handlers/textHandler');
const imageHandler = require('../handlers/imageHandler');

function registerMessageHandler(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;

        if (!jid || jid.endsWith('@g.us')) continue;

        if (isRateLimited(jid)) {
          await sock.sendMessage(jid, {
            text: templates.rateLimited()
          });
          continue;
        }

        if (msg.message.documentMessage) {
          await sock.sendMessage(jid, {
            text: templates.pdfNotAllowed()
          });
          continue;
        }

        if (msg.message.imageMessage) {
          await imageHandler.handleImageMessage(sock, msg, jid);
          continue;
        }

        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''
        ).trim();

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
            .sendMessage(msg.key.remoteJid, {
              text: templates.genericError()
            })
            .catch(() => {});
        }
      }
    }
  });
}

module.exports = {
  registerMessageHandler
};