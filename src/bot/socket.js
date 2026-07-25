const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const config = require('../config');
const logger = require('../utils/logger');

const { registerMessageHandler } = require('./messageRouter');

// Known-stable Baileys version used when the network fetch fails.
// Update this when upgrading the @whiskeysockets/baileys package.
const FALLBACK_WA_VERSION = [2, 3000, 1023291690];

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Keep a reference to the active socket so signal handlers can close it cleanly.
let _activeSock = null;

async function _shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received — closing WhatsApp connection');
  try {
    if (_activeSock) {
      _activeSock.ev.removeAllListeners();
      await _activeSock.logout().catch(() => _activeSock.ws?.close());
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Error during graceful shutdown');
  } finally {
    process.exit(0);
  }
}

// Register once at module load — not inside the retry loop
process.once('SIGINT', () => _shutdown('SIGINT'));
process.once('SIGTERM', () => _shutdown('SIGTERM'));

// ─────────────────────────────────────────────────────────────────────────────

async function startBot(retryCount = 0) {
  const MAX_RETRIES = 10;
  const backoffMs = Math.min(1000 * 2 ** retryCount, 30000);

  try {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);

    // ── WhatsApp protocol version ─────────────────────────────────────────
    let version = FALLBACK_WA_VERSION;
    try {
      const result = await fetchLatestBaileysVersion();
      if (Array.isArray(result.version) && result.version.length === 3) {
        version = result.version;
        logger.info({ version }, 'Fetched latest WA version');
      } else {
        logger.warn('fetchLatestBaileysVersion returned unexpected shape — using fallback');
      }
    } catch (err) {
      logger.warn(
        { err: err.message, fallback: FALLBACK_WA_VERSION },
        'Could not fetch WA version — using fallback'
      );
    }

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      syncFullHistory: false,
      browser: ['Mac OS', 'Chrome', '121.0.0'],
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });

    _activeSock = sock;

    sock.ev.on('creds.update', saveCreds);

    // ═══════════════════════════════════════════════════
    // PAIRING CODE — same phone එකෙන් pair කරන්න
    // ═══════════════════════════════════════════════════
    let pairingRequested = false;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      // QR code (backup method — වෙන device එකක් තියෙනවා නම්)
      if (qr) {
        console.log('\n📱 QR Code (වෙන device එකකින් scan කරන්න පුළුවන්):\n');
        qrcode.generate(qr, { small: true });
      }

      // ═══ PAIRING CODE trigger ═══
      if (
        !pairingRequested &&
        !state.creds?.registered &&
        config.PAIRING_PHONE_NUMBER &&
        (connection === 'open' || qr)
      ) {
        pairingRequested = true;

        await new Promise((r) => setTimeout(r, 2500));

        try {
          const rawCode = await sock.requestPairingCode(config.PAIRING_PHONE_NUMBER);
          const formatted = rawCode.match(/.{1,4}/g)?.join('-') || rawCode;

          console.log('\n' + '═'.repeat(45));
          console.log('🔑  PAIRING CODE (same phone එකෙන් enter කරන්න)');
          console.log('═'.repeat(45));
          console.log('\n        ➜   ' + formatted + '   ⬅\n');
          console.log('═'.repeat(45));
          console.log('\n📲 දැන් ඔබගේ phone එකේම WhatsApp වලට යන්න:');
          console.log('   1. WhatsApp → ⋮ (menu) → Linked Devices');
          console.log('   2. "Link a Device" tap කරන්න');
          console.log('   3. "Link with phone number instead" තෝරන්න');
          console.log('   4. ඉහත code එක type කරන්න: ' + formatted);
          console.log('\n⏱️  Code එක මිනිත්තු කිහිපයක් වලංගුයි.\n');
        } catch (err) {
          logger.error({ err: err.message }, 'Pairing code request failed');
          pairingRequested = false;
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          logger.error('Logged out. Run: rm -rf ./session && npm start');
          return;
        }

        if (retryCount >= MAX_RETRIES) {
          logger.error('Max reconnection attempts reached.');
          process.exit(1);
        }

        logger.warn(`Reconnecting... attempt ${retryCount + 1}/${MAX_RETRIES}`);
        setTimeout(() => startBot(retryCount + 1), backoffMs);
      }

      if (connection === 'open') {
        logger.info('✅ WhatsApp bot connected successfully');
      }
    });

    registerMessageHandler(sock);
  } catch (error) {
    logger.error({ err: error.message }, 'Bot startup error');

    if (retryCount < MAX_RETRIES) {
      setTimeout(() => startBot(retryCount + 1), backoffMs);
    } else {
      process.exit(1);
    }
  }
}

module.exports = { startBot };
