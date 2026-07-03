// MyFinance — Dashboard data context
// Loads everything the widgets need in one pass (transactions, accounts, stocks, prices)
// and pre-computes the shared aggregates. Every widget renders from this one object.
// All aggregates are derived from the already-loaded arrays — no extra queries.

import * as DB from '../db.js';
import { getProfiles } from '../profiles.js';
import { getTheme } from './themes.js';
import { locale } from '../i18n.js';

export async function loadContext() {
  const [transactions, accounts, stocks, prices] = await Promise.all([
    DB.getTransactionsWithDetails(),
    DB.getAll('accounts'),
    DB.getAll('stocks'),
    DB.getStockPrices(),
  ]);
  const priceMap = {};
  prices.forEach(p => { priceMap[p.ticker] = p.price; });

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthIncome = sum(monthTx, 'income');
  const monthExpense = sum(monthTx, 'expense');
  const net = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? (net / monthIncome * 100) : 0;

  const initialTotal = accounts.reduce((s, a) => s + parseFloat(a.initial_balance), 0);
  const portfolioValue = stocks.reduce((s, st) => s + st.quantity * (priceMap[st.ticker] || st.purchase_price), 0);

  const months = lastMonths(6);
  const series = months.map(m => {
    const upTo = transactions.filter(t => t.date.slice(0, 7) <= m);
    return initialTotal + sum(upTo, 'income') - sum(upTo, 'expense') + portfolioValue;
  });
  const netWorth = series[series.length - 1];
  const prev = series[series.length - 2] ?? netWorth;
  const trendPct = prev ? ((netWorth - prev) / Math.abs(prev)) * 100 : 0;

  const byCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    const name = t.categories?.name || 'Other';
    byCat[name] = byCat[name] || { amount: 0, icon: t.categories?.icon || 'ph-tag', color: t.categories?.color || '#6B7280' };
    byCat[name].amount += parseFloat(t.amount);
  });
  const topCats = Object.entries(byCat).sort((a, b) => b[1].amount - a[1].amount).slice(0, 4);
  const maxCat = topCats.length ? topCats[0][1].amount : 1;

  const incomeByCat = {};
  monthTx.filter(t => t.type === 'income').forEach(t => {
    const name = t.categories?.name || 'Other';
    incomeByCat[name] = incomeByCat[name] || { amount: 0, icon: t.categories?.icon || 'ph-tag', color: t.categories?.color || '#6B7280' };
    incomeByCat[name].amount += parseFloat(t.amount);
  });

  const accountBalances = accounts.map(a => {
    const at = transactions.filter(t => t.account_id === a.id);
    return { name: a.name, currency: a.currency, balance: parseFloat(a.initial_balance) + sum(at, 'income') - sum(at, 'expense') };
  });
  const cashTotal = accountBalances.reduce((s, a) => s + a.balance, 0);

  // Transaction + stock visuals
  const recentTx = [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 10);
  const monthlyIncome = months.map(m => sum(transactions.filter(t => t.date.startsWith(m)), 'income'));
  const monthlyExpense = months.map(m => sum(transactions.filter(t => t.date.startsWith(m)), 'expense'));
  const holdings = stocks.map(st => {
    const price = priceMap[st.ticker] || st.purchase_price;
    const value = st.quantity * price;
    const cost = st.quantity * st.purchase_price;
    const gain = value - cost;
    return { ticker: st.ticker, name: st.name, value, gain, gainPct: cost > 0 ? gain / cost * 100 : 0, currency: st.currency };
  });
  const portfolioCost = stocks.reduce((s, st) => s + st.quantity * st.purchase_price, 0);
  const portfolioGain = portfolioValue - portfolioCost;
  const portfolioAlloc = holdings.map(h => ({ label: h.ticker, value: h.value }));

  // --- 12-month series ---
  const months12 = lastMonths(12);
  const monthlyIncome12 = months12.map(m => sum(transactions.filter(t => t.date.startsWith(m)), 'income'));
  const monthlyExpense12 = months12.map(m => sum(transactions.filter(t => t.date.startsWith(m)), 'expense'));
  const monthlyNet12 = monthlyIncome12.map((v, i) => v - monthlyExpense12[i]);

  // --- last calendar month totals ---
  const lastYm = lastMonths(2)[0];
  const lastMonthTx = transactions.filter(t => t.date.startsWith(lastYm));
  const lastMonthIncome = sum(lastMonthTx, 'income');
  const lastMonthExpense = sum(lastMonthTx, 'expense');

  // --- cumulative daily spend, this month (to today) vs last month (full) ---
  const dayOfMonth = now.getDate();
  const cumSpendThisMonth = cumDaily(monthTx, dayOfMonth);
  const [ly, lm] = lastYm.split('-').map(Number);
  const cumSpendLastMonth = cumDaily(lastMonthTx, new Date(ly, lm, 0).getDate());

  // --- average expense per weekday (Mon..Sun) over the last 8 weeks (56 days = 8 of each) ---
  const start = new Date(now); start.setDate(start.getDate() - 55);
  const startStr = start.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  const wdTotals = [0, 0, 0, 0, 0, 0, 0];
  transactions.forEach(t => {
    if (t.type !== 'expense' || t.date < startStr || t.date > todayStr) return;
    wdTotals[weekdayIndex(t.date)] += parseFloat(t.amount);
  });
  const weekdayAvgExpense = wdTotals.map(v => v / 8);

  // --- top merchants (expenses, last 3 calendar months, grouped by normalized description) ---
  const months3 = lastMonths(3);
  const merch = {};
  transactions.forEach(t => {
    if (t.type !== 'expense' || !months3.includes(t.date.slice(0, 7))) return;
    const key = normDesc(t);
    merch[key] = merch[key] || { name: displayName(t), amount: 0, count: 0 };
    merch[key].amount += parseFloat(t.amount);
    merch[key].count++;
  });
  const topMerchants = Object.values(merch).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // --- subscriptions: same normalized description + amount within ±5%, in ≥3 of the last 4 months ---
  const months4 = lastMonths(4);
  const groups = {};
  transactions.forEach(t => {
    if (t.type !== 'expense' || !months4.includes(t.date.slice(0, 7))) return;
    (groups[normDesc(t)] ||= []).push(t);
  });
  const subList = [];
  Object.values(groups).forEach(txs => {
    txs.sort((a, b) => (a.date < b.date ? 1 : -1));           // most recent first
    const ref = parseFloat(txs[0].amount);
    if (!(ref > 0)) return;
    const hit = new Set(txs.filter(t => Math.abs(parseFloat(t.amount) - ref) <= ref * 0.05).map(t => t.date.slice(0, 7)));
    if (hit.size >= 3) subList.push({ name: displayName(txs[0]), amount: ref });
  });
  subList.sort((a, b) => b.amount - a.amount);
  const subscriptions = { list: subList, monthlyTotal: subList.reduce((s, x) => s + x.amount, 0) };

  // --- biggest single expenses this month ---
  const biggestExpenses = monthTx.filter(t => t.type === 'expense')
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5)
    .map(t => ({ description: t.description, categories: t.categories, amount: parseFloat(t.amount), date: t.date }));

  const avgDailySpend = monthExpense / dayOfMonth;

  return {
    transactions, accounts, stocks, priceMap, profiles: getProfiles(), monthTx,
    months, monthLabels: months.map(monthLabel), series, netWorth, trendPct,
    monthIncome, monthExpense, net, savingsRate,
    topCats, maxCat, accountBalances, portfolioValue,
    recentTx, monthlyIncome, monthlyExpense, holdings,
    portfolioGain, portfolioGainPct: portfolioCost > 0 ? portfolioGain / portfolioCost * 100 : 0,
    // pre-computed aggregates (widget library expansion)
    byCat, incomeByCat, cashTotal, portfolioAlloc,
    months12, monthLabels12: months12.map(monthLabel),
    monthlyIncome12, monthlyExpense12, monthlyNet12,
    lastMonthIncome, lastMonthExpense,
    cumSpendThisMonth, cumSpendLastMonth,
    weekdayAvgExpense, topMerchants, subscriptions, biggestExpenses, avgDailySpend,
    accent: getTheme('default').accent,   // overridden per-page by the active theme
    font: '',                             // overridden per-page by the active theme
    addChart: () => {},
  };
}

// Helpers
export function sum(txs, type) { return txs.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0); }
export function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  return out;
}
// Short month name in the display language + 2-digit year ("Jan 26" / "Jan 26" pt).
// pt-PT short months come lowercased with a trailing dot ("jan.") — normalized for chart axes.
export function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const raw = new Intl.DateTimeFormat(locale(), { month: 'short' }).format(new Date(Date.UTC(+y, +m - 1, 1)));
  const name = raw.replace(/\.$/, '').replace(/^./, c => c.toUpperCase());
  return `${name} ${y.slice(2)}`;
}

// Group key for "same merchant": lowercased, whitespace-collapsed description (fallback: category).
const normDesc = (t) => (t.description || t.categories?.name || 'Other').trim().toLowerCase().replace(/\s+/g, ' ');
const displayName = (t) => (t.description || t.categories?.name || 'Other').trim();

// Cumulative expense per day-of-month over `days` days: [day1, day1+2, ...].
function cumDaily(txs, days) {
  const daily = new Array(days).fill(0);
  txs.forEach(t => {
    if (t.type !== 'expense') return;
    const d = parseInt(t.date.slice(8, 10));
    if (d >= 1 && d <= days) daily[d - 1] += parseFloat(t.amount);
  });
  let run = 0;
  return daily.map(v => (run += v));
}

// 'YYYY-MM-DD' → weekday index Mon=0..Sun=6 (UTC parts, so no TZ drift).
function weekdayIndex(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
