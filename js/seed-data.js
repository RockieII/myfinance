// MyFinance — Test-data generator
// Fills the signed-in account with realistic dummy data for testing, and
// wipes it again cleanly. Everything it creates is tagged with TEST_PREFIX so
// the wipe only ever touches generated data — never your real records.
//
// Design:
//   • All dummy transactions live under dedicated [TEST] accounts. Deleting an
//     account cascades to its transactions (schema FK), so the wipe is one step.
//   • Stock holdings are name-tagged; their cache prices are seeded so the
//     Stocks/Dashboard show values even without a Finnhub key.
//   • 24 months by default, with year-over-year growth so trends are visible.

import * as DB from './db.js';

export const TEST_PREFIX = '[TEST]';

const DUMMY_STOCKS = [
  { ticker: 'AAPL',  name: 'Apple Inc.',       quantity: 12, purchase_price: 165.20, currentPrice: 212.50, changePct: 1.3 },
  { ticker: 'MSFT',  name: 'Microsoft Corp.',  quantity: 8,  purchase_price: 330.10, currentPrice: 425.80, changePct: 0.7 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',    quantity: 15, purchase_price: 138.40, currentPrice: 176.30, changePct: -0.5 },
  { ticker: 'TSLA',  name: 'Tesla Inc.',       quantity: 6,  purchase_price: 245.00, currentPrice: 210.90, changePct: -2.1 },
];

// ---- helpers ---------------------------------------------------------------

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const round2 = (n) => Math.max(0.01, Math.round(n * 100) / 100);
const chance = (p) => Math.random() < p;
const daysInMonth = (year, month0) => new Date(year, month0 + 1, 0).getDate();
const ymd = (year, month0, day) =>
  `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ---- generate --------------------------------------------------------------

export async function generateTestData({ months = 24 } = {}) {
  const user = (await DB.getClient().auth.getUser()).data.user;
  if (!user) throw new Error('Not signed in.');

  // Category id lookup, keyed by "type:name".
  const cats = await DB.getAll('categories');
  if (!cats.length) throw new Error('No categories found — run sql/seed.sql first.');
  const catId = {};
  cats.forEach(c => { catId[`${c.type}:${c.name}`] = c.id; });
  const cat = (type, name) => catId[`${type}:${name}`] || catId[`${type}:Other`];

  // 1) Three tagged accounts.
  const checking = await DB.create('accounts', { name: `${TEST_PREFIX} Checking`, type: 'checking', currency: 'EUR', initial_balance: 1500 });
  const savings  = await DB.create('accounts', { name: `${TEST_PREFIX} Savings`,  type: 'savings',  currency: 'EUR', initial_balance: 8000 });
  const cash     = await DB.create('accounts', { name: `${TEST_PREFIX} Cash`,     type: 'cash',     currency: 'EUR', initial_balance: 200 });

  // 2) Transactions, oldest month first.
  const now = new Date();
  const rows = [];
  const add = (accountId, type, catName, amount, year, month0, maxDay, description) => {
    rows.push({
      user_id: user.id,
      account_id: accountId,
      category_id: cat(type, catName),
      type,
      amount: round2(amount),
      description,
      date: ymd(year, month0, randInt(1, maxDay)),
    });
  };

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const m = d.getMonth();                       // 0-based
    const maxDay = i === 0 ? now.getDate() : daysInMonth(year, m);
    const grow = (months - 1 - i) / 12;           // 0 (oldest) → ~1.9 (newest)
    const winter = m === 11 || m === 0 || m === 1;
    const december = m === 11;

    // Income
    add(checking.id, 'income', 'Salary', 1900 + 200 * grow + rand(-40, 40), year, m, maxDay, 'Monthly salary');
    if (chance(0.35)) add(checking.id, 'income', 'Freelance', rand(150, 600), year, m, maxDay, 'Freelance project');
    if (m % 3 === 0)  add(savings.id,  'income', 'Investments', rand(40, 200) * (1 + grow), year, m, maxDay, 'Dividends');
    if (chance(0.15)) add(checking.id, 'income', 'Gifts', rand(20, 150), year, m, maxDay, 'Gift');

    // Fixed monthly expenses
    add(checking.id, 'expense', 'Housing', 720 + 50 * grow, year, m, maxDay, 'Rent');
    add(checking.id, 'expense', 'Utilities', (winter ? rand(100, 150) : rand(55, 95)), year, m, maxDay, 'Utilities');
    add(checking.id, 'expense', 'Subscriptions', rand(25, 40), year, m, maxDay, 'Streaming & apps');

    // Variable everyday expenses (grow slightly over time)
    const foodN = randInt(4, 6);
    for (let k = 0; k < foodN; k++) add(chance(0.4) ? cash.id : checking.id, 'expense', 'Food', rand(12, 85) * (1 + 0.1 * grow), year, m, maxDay, 'Groceries / dining');
    const transN = randInt(2, 3);
    for (let k = 0; k < transN; k++) add(checking.id, 'expense', 'Transport', rand(10, 60), year, m, maxDay, 'Transport');
    const entN = december ? randInt(3, 5) : randInt(1, 3);
    for (let k = 0; k < entN; k++) add(cash.id, 'expense', 'Entertainment', rand(10, 80), year, m, maxDay, 'Leisure');
    const shopN = december ? randInt(3, 6) : randInt(1, 3);
    for (let k = 0; k < shopN; k++) add(checking.id, 'expense', 'Shopping', rand(20, 150) * (december ? 1.6 : 1), year, m, maxDay, december ? 'Holiday shopping' : 'Shopping');

    // Occasional expenses
    if (chance(0.25)) add(checking.id, 'expense', 'Health', rand(20, 200), year, m, maxDay, 'Health');
    if (chance(0.15)) add(checking.id, 'expense', 'Education', rand(30, 250), year, m, maxDay, 'Course / books');
    if (chance(0.20)) add(checking.id, 'expense', 'Other', rand(15, 120), year, m, maxDay, 'Misc');
  }

  // Bulk insert transactions in chunks.
  const client = DB.getClient();
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await client.from('transactions').insert(rows.slice(i, i + 200));
    if (error) throw error;
  }

  // 3) Stock holdings + seeded cache prices.
  for (const s of DUMMY_STOCKS) {
    await DB.create('stocks', {
      ticker: s.ticker,
      name: `${TEST_PREFIX} ${s.name}`,
      quantity: s.quantity,
      purchase_price: s.purchase_price,
      purchase_date: ymd(now.getFullYear() - 1, randInt(0, 11), randInt(1, 28)),
      currency: 'USD',
    });
    await DB.upsertStockPrice(s.ticker, s.currentPrice, s.changePct);
  }

  return { accounts: 3, transactions: rows.length, stocks: DUMMY_STOCKS.length };
}

// ---- wipe ------------------------------------------------------------------

export async function wipeTestData() {
  // Delete tagged accounts → their transactions cascade away.
  const accounts = await DB.getAll('accounts');
  const testAccounts = accounts.filter(a => a.name.startsWith(TEST_PREFIX));
  for (const a of testAccounts) await DB.remove('accounts', a.id);

  // Delete tagged stock holdings.
  const stocks = await DB.getAll('stocks');
  const testStocks = stocks.filter(s => s.name.startsWith(TEST_PREFIX));
  for (const s of testStocks) await DB.remove('stocks', s.id);

  // Drop the seeded cache prices (shared cache — refetched if you hold them for real).
  await DB.getClient().from('stock_prices').delete().in('ticker', DUMMY_STOCKS.map(s => s.ticker));

  return { accounts: testAccounts.length, stocks: testStocks.length };
}

// Quick check used by the Settings panel to show current state.
export async function countTestData() {
  const accounts = await DB.getAll('accounts');
  return accounts.filter(a => a.name.startsWith(TEST_PREFIX)).length;
}
