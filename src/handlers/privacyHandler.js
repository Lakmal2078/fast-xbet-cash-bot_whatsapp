const db = require('../db');
const userService = require('../services/userService');
const templates = require('../templates');

async function handlePrivacyCommand(sock, msg, args = []) {
  const jid = msg.key.remoteJid;
  const lang = userService.getLanguage(jid);

  const subCommand = (args[0] || '').toLowerCase();
  const value = (args[1] || '').toLowerCase();

  if (subCommand === 'get') {
    const user = userService.getUser(jid);
    const pref = user?.privacy_pref || 'standard';

    await sock.sendMessage(jid, {
      text: templates.privacyCurrent(pref, lang)
    });
    return;
  }

  if (subCommand === 'set') {
    if (value === 'delete') {
      // ── Two-step confirmation before hard-deleting all user data ──
      // Set a short-lived state; textHandler will resolve 'yes'/'no'.
      db.setState(jid, {
        step: 'CONFIRM_PRIVACY_DELETE',
        expires: Date.now() + 2 * 60 * 1000  // 2-minute confirmation window
      });
      await sock.sendMessage(jid, {
        text: templates.privacyDeleteConfirm(lang)
      });
      return;
    }

    // 'minimal' was never documented or supported in VALID_PRIVACY_PREFS;
    // only 'standard' is a valid persisted preference (not 'delete').
    if (value === 'standard') {
      userService.ensureUser(jid);
      userService.setPrivacyPref(jid, value);

      await sock.sendMessage(jid, {
        text: templates.privacyUpdated(value, lang)
      });
      return;
    }

    // ── Invalid option: give a clear error instead of showing the full policy ──
    if (value) {
      await sock.sendMessage(jid, {
        text: templates.privacyInvalidOption(value, lang)
      });
      return;
    }
  }

  await sock.sendMessage(jid, {
    text: templates.privacyPolicy(lang)
  });
}

module.exports = {
  handlePrivacyCommand
};