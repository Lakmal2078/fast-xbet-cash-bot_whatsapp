const { initDatabase, closeDatabase } = require('./db');
const { startBot } = require('./bot/socket');
const logger = require('./utils/logger');

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down bot');

  try {
    closeDatabase();
  } catch {
    // Ignore close errors during shutdown
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

(async () => {
  try {
    initDatabase();
    logger.info('Starting Fast XBet Cash Bot');
    await startBot();
  } catch (error) {
    logger.fatal({ err: error.message }, 'Fatal startup error');
    process.exit(1);
  }
})();