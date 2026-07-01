// MyFinance — Dashboard View
// A single-viewport (no-scroll) overview: net-worth hero, cash-flow strip,
// top spending, and a compact net-worth trend. Details live behind a tap.

import * as DB from '../db.js';
import { formatMoney } from '../format.js';
import { openSheet } from '../sheet.js';

let chartInstances = [];
const GRID = '#E2E6EC';
const TICK = '#6B7280';

export async function renderDashboard(container) {
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];

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
  const monthIncome = sumByType(monthTx, 'income');
  const monthExpense = sumByType(monthTx, 'expense');
  const net = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? (net / monthIncome * 100) : 0;

  const initialTotal = accounts.reduce((s, a) => s + parseFloat(a.initial_balance), 0);
  const portfolioValue = stocks.reduce((s, st) => s + st.quantity * (priceMap[st.ticker] || st.purchase_price), 0);

  // Net-worth series over the last 6 months (cumulative up to each month-end).
  const months = getLastMonths(6);
  const series = months.map(m => {
    const upTo = transactions.filter(t => t.date.slice(0, 7) <= m);
    return initialTotal + sumByType(upTo, 'income') - sumByType(upTo, 'expense') + portfolioValue;
  });
  const netWorth = series[series.length - 1];
  const prev = series[series.length - 2] ?? netWorth;
  const trendPct = prev ? ((netWorth - prev) / Math.abs(prev)) * 100 : 0;
  const trendClass = trendPct >= 0 ? 'text-up' : 'text-down';

  // Top spending this month.
  const byCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    const name = t.categories?.name || 'Other';
    byCat[name] = byCat[name] || { amount: 0, icon: t.categories?.icon || 'ph-tag', color: t.categories?.color || '#6B7280' };
    byCat[name].amount += parseFloat(t.amount);
  });
  const topCats = Object.entries(byCat).sort((a, b) => b[1].amount - a[1].amount).slice(0, 4);
  const maxCat = topCats.length ? topCats[0][1].amount : 1;

  container.innerHTML = `
    <div class="dash">
      <div class="hero card">
        <div>
          <div class="label">Net Worth</div>
          <div class="hero-value money">${formatMoney(netWorth, 'EUR', 0)}</div>
          <div class="hero-trend ${trendClass}">${trendPct >= 0 ? '▲' : '▼'} ${Math.abs(trendPct).toFixed(1)}% this month</div>
        </div>
        <div class="chart-box hero-spark"><canvas id="nw-spark"></canvas></div>
      </div>

      <div class="strip">
        <div class="stat"><span class="label">In</span><span class="val money text-up">${formatMoney(monthIncome, 'EUR', 0)}</span></div>
        <div class="stat"><span class="label">Out</span><span class="val money text-down">${formatMoney(monthExpense, 'EUR', 0)}</span></div>
        <div class="stat"><span class="label">Net</span><span class="val money ${net >= 0 ? 'text-up' : 'text-down'}">${net >= 0 ? '+' : ''}${formatMoney(net, 'EUR', 0)}</span></div>
        <div class="stat"><span class="label">Savings</span><span class="val ${savingsRate >= 0 ? 'text-up' : 'text-down'}">${savingsRate.toFixed(0)}%</span></div>
      </div>

      <div class="card topcats">
        <div class="flex-between">
          <span class="label">Spending · ${monthLabel(currentMonth)}</span>
          <button class="link" id="see-all">See all ▸</button>
        </div>
        <div class="cat-bars">
          ${topCats.length ? topCats.map(([name, c]) => `
            <div class="cat-bar">
              <i class="ph ${c.icon}" style="color:${c.color}"></i>
              <div>
                <div class="fs-12">${name}</div>
                <div class="track"><div class="fill" style="width:${Math.max(6, c.amount / maxCat * 100)}%;background:${c.color}"></div></div>
              </div>
              <span class="amt">${formatMoney(c.amount, 'EUR', 0)}</span>
            </div>
          `).join('') : '<div class="empty">No spending this month.</div>'}
        </div>
      </div>

      <div class="card trend">
        <span class="label">Net worth · last 6 months</span>
        <div class="chart-box"><canvas id="nw-chart"></canvas></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    initSpark(series);
    initTrend(months, series);
  }, 0);

  container.querySelector('#see-all').addEventListener('click', () => openCategorySheet(monthTx));
}

function initSpark(series) {
  const ctx = document.getElementById('nw-spark');
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'line',
    data: { labels: series.map(() => ''), datasets: [{ data: series, borderColor: '#1E7F5C', borderWidth: 2, fill: true, backgroundColor: 'rgba(30,127,92,.12)', tension: .35, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  }));
}

function initTrend(months, series) {
  const ctx = document.getElementById('nw-chart');
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(monthLabel),
      datasets: [{ data: series, borderColor: '#1E7F5C', backgroundColor: 'rgba(30,127,92,.10)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: '#1E7F5C' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: TICK, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: TICK, font: { size: 10 }, maxTicksLimit: 4 }, grid: { color: GRID } },
      },
    },
  }));
}

function openCategorySheet(monthTx) {
  const byCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    const name = t.categories?.name || 'Other';
    byCat[name] = byCat[name] || { amount: 0, color: t.categories?.color || '#6B7280' };
    byCat[name].amount += parseFloat(t.amount);
  });
  const labels = Object.keys(byCat);
  const data = labels.map(n => byCat[n].amount);
  const colors = labels.map(n => byCat[n].color);

  const { el, close } = openSheet(`
    <h3>Spending breakdown</h3>
    ${labels.length ? '<div class="chart-box" style="height:280px"><canvas id="cat-full"></canvas></div>' : '<div class="empty">No expenses this month.</div>'}
    <button class="btn btn-outline mt-12" id="cat-close" style="width:100%">Close</button>
  `);
  el.querySelector('#cat-close').addEventListener('click', close);

  const ctx = el.querySelector('#cat-full');
  if (ctx) {
    new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: TICK, padding: 10, font: { size: 12 } } } } },
    });
  }
}

// Helpers
function sumByType(txs, type) {
  return txs.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0);
}
function getLastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  return out;
}
function monthLabel(ym) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m] = ym.split('-');
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`;
}
