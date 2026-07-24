const userService = require('../services/userService');
const templates = require('../templates');

async function handlePrivacyCommand(sock, msg, args = []) {
  const jid = msg.key.remoteJid;

  const subCommand = (args[0] || '').toLowerCase();
  const value = (args[1] || '').toLowerCase();

  if (subCommand === 'get') {
    const user = userService.getUser(jid);
    const pref = user?.privacy_pref || 'standard';

    await sock.sendMessage(jid, {
      text: templates.privacyCurrent(pref)
    });
    return;
  }

  if (subCommand === 'set') {
    if (value === 'delete') {
      userService.deleteUser(jid);

      await sock.sendMessage(jid, {
        text: templates.privacyDeleted()
      });
      return;
    }

    if (value === 'standard' || value === 'minimal') {
      userService.ensureUser(jid);
      userService.setPrivacyPref(jid, value);

      await sock.sendMessage(jid, {
        text: templates.privacyUpdated(value)
      });
      return;
    }
  }

  await sock.sendMessage(jid, {
    text: templates.privacyPolicy()
  });
}

module.exports = {
  handlePrivacyCommand
};