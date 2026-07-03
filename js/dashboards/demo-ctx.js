// MyFinance — Demo context for widget previews
// A fully static, realistic-EUR stand-in for loadContext()'s return value, covering every
// field any widget reads. The widget library renders REAL widgets against (a copy of) this
// object to produce live previews. Everything is hardcoded/deterministic — no Date, no queries.
// addChart is a no-op here; the library's copy overrides it to track preview charts.

import { monthLabel } from './context.js';

const CAT = {
  groceries: { name: 'Groceries', icon: 'ph-shopping-cart', color: '#0EA5E9' },
  rent:      { name: 'Rent',      icon: 'ph-house',         color: '#6366F1' },
  dining:    { name: 'Dining',    icon: 'ph-fork-knife',    color: '#D97706' },
  transport: { name: 'Transport', icon: 'ph-car',           color: '#7C3AED' },
  fun:       { name: 'Fun',       icon: 'ph-game-controller', color: '#E11D48' },
  salary:    { name: 'Salary',    icon: 'ph-briefcase',     color: '#1E7F5C' },
  freelance: { name: 'Freelance', icon: 'ph-laptop',        color: '#14B8A6' },
};

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const MONTHS12 = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', ...MONTHS];
// Labels derive from monthLabel so previews follow the display language (pt shows pt months).
const LABELS = MONTHS.map(monthLabel);
const LABELS12 = MONTHS12.map(monthLabel);

const PROFILES = [
  { id: 'p1', name: 'Afonso', color: '#1E7F5C' },
  { id: 'p2', name: 'Rita',   color: '#6366F1' },
];

// Per-profile monthly expenses across MONTHS — feeds by-person-trend via ctx.transactions.
const SPEND_P1 = [640, 720, 585, 690, 750, 610];
const SPEND_P2 = [420, 505, 470, 385, 520, 455];
const transactions = MONTHS.flatMap((m, i) => [
  { date: `${m}-05`, type: 'expense', amount: SPEND_P1[i], profile_id: 'p1', description: 'Monthly spending', categories: CAT.groceries },
  { date: `${m}-08`, type: 'expense', amount: SPEND_P2[i], profile_id: 'p2', description: 'Monthly spending', categories: CAT.dining },
  { date: `${m}-01`, type: 'income',  amount: 1650, profile_id: 'p1', description: 'Salary', categories: CAT.salary },
  { date: `${m}-02`, type: 'income',  amount: 1280, profile_id: 'p2', description: 'Salary', categories: CAT.salary },
]);

// Current-month rows — feed the per-person "this month" widgets.
const monthTx = [
  { date: '2026-06-01', type: 'income',  amount: 1650, profile_id: 'p1', description: 'Salary', categories: CAT.salary },
  { date: '2026-06-02', type: 'income',  amount: 1280, profile_id: 'p2', description: 'Salary', categories: CAT.salary },
  { date: '2026-06-03', type: 'income',  amount: 320,  profile_id: 'p1', description: 'Freelance invoice', categories: CAT.freelance },
  { date: '2026-06-01', type: 'expense', amount: 780,  profile_id: 'p1', description: 'Rent', categories: CAT.rent },
  { date: '2026-06-04', type: 'expense', amount: 96.4, profile_id: 'p2', description: 'Continente', categories: CAT.groceries },
  { date: '2026-06-07', type: 'expense', amount: 54.2, profile_id: 'p1', description: 'Restaurante A Tasca', categories: CAT.dining },
  { date: '2026-06-09', type: 'expense', amount: 41,   profile_id: 'p2', description: 'Galp fuel', categories: CAT.transport },
  { date: '2026-06-12', type: 'expense', amount: 88.7, profile_id: 'p2', description: 'Continente', categories: CAT.groceries },
  { date: '2026-06-14', type: 'expense', amount: 129,  profile_id: 'p1', description: 'Concert tickets', categories: CAT.fun },
];

const byCat = {
  Rent:      { amount: 780, icon: CAT.rent.icon,      color: CAT.rent.color },
  Groceries: { amount: 342, icon: CAT.groceries.icon, color: CAT.groceries.color },
  Dining:    { amount: 218, icon: CAT.dining.icon,    color: CAT.dining.color },
  Transport: { amount: 154, icon: CAT.transport.icon, color: CAT.transport.color },
  Fun:       { amount: 129, icon: CAT.fun.icon,       color: CAT.fun.color },
};
const topCats = Object.entries(byCat).slice(0, 4);

// Cumulative daily spend (already summed) — this month up to day 18, last month full 31 days.
const cumSpendThisMonth = [780, 795, 812, 908, 921, 943, 997, 1010, 1051, 1066, 1090, 1179, 1194, 1323, 1341, 1360, 1398, 1421];
const cumSpendLastMonth = [760, 771, 790, 842, 861, 880, 927, 941, 969, 990, 1024, 1058, 1071, 1102, 1140, 1163, 1189, 1214, 1246, 1275, 1301, 1340, 1372, 1401, 1438, 1462, 1495, 1528, 1556, 1590, 1621];

const holdings = [
  { ticker: 'VWCE', name: 'Vanguard FTSE All-World', value: 6480, gain: 742,  gainPct: 12.9,  currency: 'EUR' },
  { ticker: 'AAPL', name: 'Apple',                   value: 2310, gain: 388,  gainPct: 20.2,  currency: 'USD' },
  { ticker: 'MSFT', name: 'Microsoft',               value: 1925, gain: 214,  gainPct: 12.5,  currency: 'USD' },
  { ticker: 'TSLA', name: 'Tesla',                   value: 830,  gain: -170, gainPct: -17.0, currency: 'USD' },
];

export const DEMO_CTX = {
  // raw-ish collections
  transactions, monthTx, profiles: PROFILES,
  accounts: [], stocks: [], priceMap: {},
  recentTx: [...monthTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6),

  // 6-month series
  months: MONTHS, monthLabels: LABELS,
  series: [21850, 22300, 22190, 22940, 23480, 24180],
  monthlyIncome: [2930, 2930, 3250, 2930, 3105, 3250],
  monthlyExpense: [2210, 2405, 2098, 2312, 2540, 1421],

  // headline numbers
  netWorth: 24180, trendPct: 3.0,
  monthIncome: 3250, monthExpense: 1421, net: 1829, savingsRate: 56,

  // categories
  byCat, topCats, maxCat: 780,
  incomeByCat: {
    Salary:    { amount: 2930, icon: CAT.salary.icon,    color: CAT.salary.color },
    Freelance: { amount: 320,  icon: CAT.freelance.icon, color: CAT.freelance.color },
  },

  // accounts
  accountBalances: [
    { name: 'Main account', currency: 'EUR', balance: 8340 },
    { name: 'Savings',      currency: 'EUR', balance: 3860 },
    { name: 'Revolut',      currency: 'EUR', balance: 435 },
  ],
  cashTotal: 12635,

  // portfolio
  holdings,
  portfolioValue: 11545, portfolioGain: 1174, portfolioGainPct: 11.3,
  portfolioAlloc: holdings.map(h => ({ label: h.ticker, value: h.value })),

  // 12-month series
  months12: MONTHS12, monthLabels12: LABELS12,
  monthlyIncome12: [2870, 2870, 2870, 2930, 2930, 3410, 2930, 2930, 3250, 2930, 3105, 3250],
  monthlyExpense12: [2340, 2510, 2190, 2280, 2455, 3120, 2210, 2405, 2098, 2312, 2540, 1421],
  monthlyNet12: [530, 360, 680, 650, 475, 290, 720, 525, 1152, 618, 565, 1829],

  // month comparison + daily spend
  lastMonthIncome: 3105, lastMonthExpense: 2540,
  cumSpendThisMonth, cumSpendLastMonth,
  avgDailySpend: 79,

  // habits
  weekdayAvgExpense: [34, 28, 31, 39, 52, 74, 46],
  topMerchants: [
    { name: 'Continente', amount: 412.6, count: 9 },
    { name: 'Galp fuel', amount: 186, count: 5 },
    { name: 'Restaurante A Tasca', amount: 164.8, count: 4 },
    { name: 'IKEA', amount: 149.9, count: 1 },
    { name: 'Pingo Doce', amount: 121.3, count: 6 },
  ],
  subscriptions: {
    list: [
      { name: 'Gym', amount: 29.9 },
      { name: 'Netflix', amount: 12.99 },
      { name: 'Spotify', amount: 10.99 },
      { name: 'iCloud', amount: 2.99 },
    ],
    monthlyTotal: 56.87,
  },
  biggestExpenses: [
    { description: 'Rent', categories: CAT.rent, amount: 780, date: '2026-06-01' },
    { description: 'Concert tickets', categories: CAT.fun, amount: 129, date: '2026-06-14' },
    { description: 'Continente', categories: CAT.groceries, amount: 96.4, date: '2026-06-04' },
    { description: 'Continente', categories: CAT.groceries, amount: 88.7, date: '2026-06-12' },
    { description: 'Restaurante A Tasca', categories: CAT.dining, amount: 54.2, date: '2026-06-07' },
  ],

  // theme + chart hook (library copies override addChart)
  accent: '#1E7F5C',
  font: '',
  addChart: () => {},
};
