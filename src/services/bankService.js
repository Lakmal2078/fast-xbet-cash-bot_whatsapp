const db = require('../db');

function getActiveBanks() {
  return db.all(
    'SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY sort_key ASC'
  );
}

function getBankBySort(sortKey) {
  return db.get(
    'SELECT * FROM bank_accounts WHERE is_active = 1 AND sort_key = ?',
    [sortKey]
  );
}

module.exports = {
  getActiveBanks,
  getBankBySort
};