// MyFinance — Widget registry
// Each widget: { title, desc, tags, section, minW, minH, render(bodyEl, ctx) }.
//   section: 'solo' (single dimension) or 'multiple' (per-profile).
//   minW/minH: minimum size in grid cells. Widgets adapt to whatever size the grid gives them.
//   desc: 1-2 plain sentences (what it shows + how it's computed); English literal, translated at render.
//   tags: frozen taxonomy — visual: chart, line, bars, pie, card, list, gauge, heatmap;
//         domain: net worth, spending, earnings, subscriptions, accounts, stocks, budget, people, transactions.
// Charts must register via ctx.addChart(chart) so the engine can destroy them on re-render.

import { formatMoney, esc } from '../format.js';
import { t } from '../i18n.js';

const ACCENT = '#1E7F5C';
const DOWN = '#C6304B';     // matches --down (canvas can't read CSS vars)
const GRID = '#E2E6EC';
const TICK = '#6B7280';
const PALETTE = ['#1E7F5C', '#6366F1', '#0EA5E9', '#D97706', '#E11D48', '#7C3AED', '#14B8A6', '#64748B'];

const chartBox = () => `<div class="chart-box" style="flex:1;min-height:0"><canvas></canvas></div>`;
const axis = (ctx) => ({
  x: { ticks: { color: TICK, font: { size: 9, family: ctx.font || undefined } }, grid: { display: false } },
  y: { ticks: { color: TICK, font: { size: 9, family: ctx.font || undefined }, maxTicksLimit: 4 }, grid: { color: GRID } },
});
const noLegend = { legend: { display: false } };
const listRow = (left, right) => `
  <div class="flex-between" style="padding:5px 0;border-bottom:1px solid var(--border)">${left}${right}</div>`;

// Donut helper — items: [{label, value, color}].
function donut(el, ctx, items, emptyMsg) {
  items = items.filter(i => i.value > 0);
  if (!items.length) { el.innerHTML = `<div class="empty">${emptyMsg}</div>`; return; }
  el.innerHTML = chartBox();
  ctx.addChart(new Chart(el.querySelector('canvas'), {
    type: 'doughnut',
    data: { labels: items.map(i => i.label), datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, family: ctx.font || undefined }, color: TICK } } } },
  }));
}

// byCat-shaped object ({name: {amount, color}}) → donut items, biggest first.
const catItems = (byCat, max = 6) => Object.entries(byCat || {})
  .sort((a, b) => b[1].amount - a[1].amount).slice(0, max)
  .map(([name, c], i) => ({ label: name, value: c.amount, color: c.color || PALETTE[i % PALETTE.length] }));

const needsProfiles = (el) => { el.innerHTML = `<div class="empty fs-12">${t('Add 2+ profiles (Settings) to use this.')}</div>`; return true; };

export const WIDGETS = {
  'net-worth': {
    title: 'Net Worth', section: 'solo', minW: 2, minH: 1,
    desc: 'Your total net worth (accounts plus portfolio) with the change versus last month and a 6-month sparkline.',
    tags: ['card', 'line', 'net worth'],
    render(el, ctx) {
      el.innerHTML = `
        <div class="w-value money">${formatMoney(ctx.netWorth, 'EUR', 0)}</div>
        <div class="fs-12 ${ctx.trendPct >= 0 ? 'text-up' : 'text-down'}" style="margin-bottom:6px">
          ${ctx.trendPct >= 0 ? '▲' : '▼'} ${Math.abs(ctx.trendPct).toFixed(1)}% ${t('this month')}</div>
        ${chartBox()}`;
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: { labels: ctx.series.map(() => ''), datasets: [{ data: ctx.series, borderColor: acc, borderWidth: 2, fill: true, backgroundColor: acc + '22', tension: .35, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
      }));
    },
  },

  'cash-flow': {
    title: 'Cash Flow · this month', section: 'solo', minW: 2, minH: 1,
    desc: 'This month\'s income, expenses, net result and savings rate at a glance.',
    tags: ['card', 'spending', 'earnings', 'budget'],
    render(el, ctx) {
      el.innerHTML = `
        <div class="w-stats">
          <div><span class="w-lbl">${t('In')}</span><span class="w-num money text-up">${formatMoney(ctx.monthIncome, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">${t('Out')}</span><span class="w-num money text-down">${formatMoney(ctx.monthExpense, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">${t('Net')}</span><span class="w-num money ${ctx.net >= 0 ? 'text-up' : 'text-down'}">${ctx.net >= 0 ? '+' : ''}${formatMoney(ctx.net, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">${t('Savings')}</span><span class="w-num ${ctx.savingsRate >= 0 ? 'text-up' : 'text-down'}">${ctx.savingsRate.toFixed(0)}%</span></div>
        </div>`;
    },
  },

  'spending': {
    title: 'Top Spending · this month', section: 'solo', minW: 2, minH: 2,
    desc: 'Your top expense categories this month as horizontal bars, using each category\'s colour.',
    tags: ['bars', 'spending'],
    render(el, ctx) {
      el.innerHTML = ctx.topCats.length
        ? `<div class="cat-bars">${ctx.topCats.map(([name, c]) => `
            <div class="cat-bar">
              <i class="ph ${esc(c.icon)}" style="color:${esc(c.color)}"></i>
              <div><div class="fs-12">${esc(name)}</div>
                <div class="track"><div class="fill" style="width:${Math.max(6, c.amount / ctx.maxCat * 100)}%;background:${c.color}"></div></div></div>
              <span class="amt">${formatMoney(c.amount, 'EUR', 0)}</span>
            </div>`).join('')}</div>`
        : `<div class="empty">${t('No spending this month.')}</div>`;
    },
  },

  'trend': {
    title: 'Net Worth · 6 months', section: 'solo', minW: 2, minH: 2,
    desc: 'Net worth month by month over the last 6 months, as a filled line chart.',
    tags: ['chart', 'line', 'net worth'],
    render(el, ctx) {
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: { labels: ctx.monthLabels, datasets: [{ data: ctx.series, borderColor: acc, backgroundColor: acc + '1A', fill: true, tension: .3, pointRadius: 2, pointBackgroundColor: acc }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: axis(ctx) },
      }));
    },
  },

  'savings': {
    title: 'Savings Rate', section: 'solo', minW: 1, minH: 1,
    desc: 'The share of this month\'s income you kept: (income − expenses) / income.',
    tags: ['card', 'budget'],
    render(el, ctx) {
      const r = ctx.savingsRate;
      el.innerHTML = `<div class="w-center">
        <div class="w-value ${r >= 0 ? 'text-up' : 'text-down'}">${r.toFixed(0)}%</div>
        <div class="fs-12 text-dim">${t('saved this month')}</div></div>`;
    },
  },

  'accounts': {
    title: 'Accounts', section: 'solo', minW: 2, minH: 2,
    desc: 'Every account with its current balance (initial balance plus all transactions).',
    tags: ['list', 'accounts'],
    render(el, ctx) {
      el.innerHTML = ctx.accountBalances.length
        ? `<div class="w-list">${ctx.accountBalances.map(a => listRow(
            `<span class="fs-12">${esc(a.name)}</span>`,
            `<span class="fw-600 money">${formatMoney(a.balance, a.currency || 'EUR', 0)}</span>`)).join('')}</div>`
        : `<div class="empty">${t('No accounts.')}</div>`;
    },
  },

  'recent-tx': {
    title: 'Recent transactions', section: 'solo', minW: 2, minH: 2,
    desc: 'Your latest transactions with category icon, description and signed amount.',
    tags: ['list', 'transactions'],
    render(el, ctx) {
      el.innerHTML = ctx.recentTx.length
        ? `<div class="w-list">${ctx.recentTx.map(tx => {
            const inc = tx.type === 'income';
            const col = tx.categories?.color || 'var(--accent)';
            return listRow(
              `<span class="fs-12" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
                <i class="ph ${esc(tx.categories?.icon || 'ph-tag')}" style="color:${esc(col)}"></i> ${esc(tx.description || tx.categories?.name || '')}</span>`,
              `<span class="fw-600 money ${inc ? 'text-up' : 'text-down'}" style="flex-shrink:0;margin-left:8px">${inc ? '+' : '-'}${formatMoney(tx.amount)}</span>`);
          }).join('')}</div>`
        : `<div class="empty">${t('No transactions.')}</div>`;
    },
  },

  'io-bars': {
    title: 'Income vs Expenses · 6 months', section: 'solo', minW: 2, minH: 2,
    desc: 'Monthly income and expense totals side by side for the last 6 months.',
    tags: ['chart', 'bars', 'spending', 'earnings'],
    render(el, ctx) {
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'bar',
        data: { labels: ctx.monthLabels, datasets: [
          { label: t('In'), data: ctx.monthlyIncome, backgroundColor: acc, borderRadius: 3 },
          { label: t('Out'), data: ctx.monthlyExpense, backgroundColor: DOWN, borderRadius: 3 },
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: axis(ctx) },
      }));
    },
  },

  'portfolio': {
    title: 'Portfolio', section: 'solo', minW: 1, minH: 1,
    desc: 'Current portfolio value at the latest prices, with total gain versus purchase cost.',
    tags: ['card', 'stocks'],
    render(el, ctx) {
      const g = ctx.portfolioGain;
      el.innerHTML = `<div class="w-center">
        <div class="w-value money">${formatMoney(ctx.portfolioValue, 'EUR', 0)}</div>
        <div class="fs-12 ${g >= 0 ? 'text-up' : 'text-down'}">${g >= 0 ? '+' : ''}${formatMoney(g, 'EUR', 0)} (${ctx.portfolioGainPct.toFixed(1)}%)</div>
      </div>`;
    },
  },

  'holdings': {
    title: 'Holdings', section: 'solo', minW: 2, minH: 2,
    desc: 'Each holding with its current value and gain since purchase.',
    tags: ['list', 'stocks'],
    render(el, ctx) {
      el.innerHTML = ctx.holdings.length
        ? `<div class="w-list">${ctx.holdings.map(h => listRow(
            `<span class="fs-12 fw-600">${esc(h.ticker)}</span>`,
            `<span class="fs-12 money ${h.gain >= 0 ? 'text-up' : 'text-down'}">${formatMoney(h.value, h.currency || 'USD', 0)} · ${h.gainPct >= 0 ? '+' : ''}${h.gainPct.toFixed(1)}%</span>`)).join('')}</div>`
        : `<div class="empty">${t('No holdings.')}</div>`;
    },
  },

  // --- New: donuts / charts ---
  'category-donut': {
    title: 'Spending by category', section: 'solo', minW: 2, minH: 2,
    desc: 'A donut splitting this month\'s expenses across categories, using each category\'s colour.',
    tags: ['chart', 'pie', 'spending'],
    render(el, ctx) { donut(el, ctx, catItems(ctx.byCat), t('No spending this month.')); },
  },

  'income-donut': {
    title: 'Income by category', section: 'solo', minW: 2, minH: 2,
    desc: 'A donut splitting this month\'s income across categories (salary, freelance, ...).',
    tags: ['chart', 'pie', 'earnings'],
    render(el, ctx) { donut(el, ctx, catItems(ctx.incomeByCat), t('No income this month.')); },
  },

  'yearly-net': {
    title: 'Net by month · 12 months', section: 'solo', minW: 2, minH: 2,
    desc: 'Monthly net result (income minus expenses) for the last 12 months; positive months in the accent colour, negative in red.',
    tags: ['chart', 'bars', 'budget', 'net worth'],
    render(el, ctx) {
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'bar',
        data: { labels: ctx.monthLabels12, datasets: [{ data: ctx.monthlyNet12, backgroundColor: ctx.monthlyNet12.map(v => (v >= 0 ? acc : DOWN)), borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: axis(ctx) },
      }));
    },
  },

  'month-compare': {
    title: 'This month vs last', section: 'solo', minW: 2, minH: 2,
    desc: 'Grouped bars comparing income and expenses between last month and this month.',
    tags: ['chart', 'bars', 'spending', 'earnings'],
    render(el, ctx) {
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'bar',
        data: {
          labels: [t('Last month'), t('This month')],
          datasets: [
            { label: t('In'), data: [ctx.lastMonthIncome, ctx.monthIncome], backgroundColor: acc, borderRadius: 3 },
            { label: t('Out'), data: [ctx.lastMonthExpense, ctx.monthExpense], backgroundColor: DOWN, borderRadius: 3 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 }, color: TICK } } }, scales: axis(ctx) },
      }));
    },
  },

  'daily-spend': {
    title: 'Daily spend · cumulative', section: 'solo', minW: 2, minH: 2,
    desc: 'Cumulative spending day by day: this month (accent) plotted against last month (grey) so you can see if you\'re ahead or behind.',
    tags: ['chart', 'line', 'spending'],
    render(el, ctx) {
      const cur = ctx.cumSpendThisMonth || [], prev = ctx.cumSpendLastMonth || [];
      if (!cur.length && !prev.length) { el.innerHTML = `<div class="empty">${t('No spending yet.')}</div>`; return; }
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      const days = Math.max(cur.length, prev.length);
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: {
          labels: Array.from({ length: days }, (_, i) => i + 1),
          datasets: [
            { label: t('This month'), data: cur, borderColor: acc, backgroundColor: acc + '1A', fill: true, borderWidth: 2, tension: .2, pointRadius: 0 },
            { label: t('Last month'), data: prev, borderColor: TICK, borderDash: [4, 4], borderWidth: 1.5, tension: .2, pointRadius: 0 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 }, color: TICK } } }, scales: axis(ctx) },
      }));
    },
  },

  'weekday-spend': {
    title: 'Spending by weekday', section: 'solo', minW: 2, minH: 2,
    desc: 'Average amount spent on each weekday over the last 8 weeks — spot your expensive days.',
    tags: ['chart', 'bars', 'spending'],
    render(el, ctx) {
      el.innerHTML = chartBox();
      const acc = ctx.accent || ACCENT;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'bar',
        data: { labels: [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')], datasets: [{ data: ctx.weekdayAvgExpense || [], backgroundColor: acc, borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: noLegend, scales: axis(ctx) },
      }));
    },
  },

  'account-donut': {
    title: 'Balance by account', section: 'solo', minW: 2, minH: 2,
    desc: 'A donut showing how your cash is split across accounts (positive balances only).',
    tags: ['chart', 'pie', 'accounts'],
    render(el, ctx) {
      const items = (ctx.accountBalances || []).map((a, i) => ({ label: a.name, value: a.balance, color: PALETTE[i % PALETTE.length] }));
      donut(el, ctx, items, t('No accounts.'));
    },
  },

  // --- New: cards ---
  'avg-daily-spend': {
    title: 'Avg daily spend', section: 'solo', minW: 1, minH: 1,
    desc: 'This month\'s expenses divided by the days elapsed so far.',
    tags: ['card', 'spending'],
    render(el, ctx) {
      el.innerHTML = `<div class="w-center">
        <div class="w-value money">${formatMoney(ctx.avgDailySpend || 0, 'EUR', 0)}</div>
        <div class="fs-12 text-dim">${t('per day this month')}</div></div>`;
    },
  },

  'cash-vs-invested': {
    title: 'Cash vs invested', section: 'solo', minW: 2, minH: 1,
    desc: 'How your net worth splits between account cash and portfolio value, with a proportion bar.',
    tags: ['card', 'accounts', 'stocks'],
    render(el, ctx) {
      const cash = Math.max(0, ctx.cashTotal || 0), inv = Math.max(0, ctx.portfolioValue || 0);
      const total = cash + inv;
      if (!total) { el.innerHTML = `<div class="empty">${t('No accounts or holdings yet.')}</div>`; return; }
      const cp = cash / total * 100;
      const acc = ctx.accent || ACCENT;
      el.innerHTML = `
        <div class="w-stats" style="grid-template-columns:1fr 1fr">
          <div><span class="w-lbl">${t('Cash')}</span><span class="w-num money">${formatMoney(cash, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">${t('Invested')}</span><span class="w-num money">${formatMoney(inv, 'EUR', 0)}</span></div>
        </div>
        <div class="split-bar"><span style="width:${cp.toFixed(1)}%;background:${acc}"></span><span style="width:${(100 - cp).toFixed(1)}%;background:#6366F1"></span></div>
        <div class="fs-12 text-dim">${cp.toFixed(0)}% ${t('cash')} · ${(100 - cp).toFixed(0)}% ${t('invested')}</div>`;
    },
  },

  'savings-goal': {
    title: 'Savings goal', section: 'solo', minW: 2, minH: 1,
    desc: 'Progress toward a 20% savings-rate target, based on this month\'s income and expenses.',
    tags: ['gauge', 'budget'],
    render(el, ctx) {
      const r = ctx.savingsRate || 0;
      const pct = Math.max(0, Math.min(100, r / 20 * 100));
      const acc = ctx.accent || ACCENT;
      el.innerHTML = `
        <div class="flex-between" style="margin-bottom:6px">
          <span class="w-value ${r >= 20 ? 'text-up' : ''}" style="font-size:20px">${r.toFixed(0)}%</span>
          <span class="fs-12 text-dim">${t('target')} 20%</span>
        </div>
        <div class="track" style="height:10px;background:var(--surface-2);border-radius:999px;overflow:hidden">
          <div class="fill" style="height:100%;width:${pct.toFixed(0)}%;background:${r >= 20 ? acc : (r >= 0 ? '#D97706' : DOWN)};border-radius:999px"></div>
        </div>
        <div class="fs-12 text-dim" style="margin-top:6px">${r >= 20 ? t('Target reached — nice.') : t('Savings rate this month vs a 20% target.')}</div>`;
    },
  },

  // --- New: lists ---
  'biggest-expenses': {
    title: 'Biggest expenses', section: 'solo', minW: 2, minH: 2,
    desc: 'The 5 largest single expenses this month, with category and date.',
    tags: ['list', 'spending', 'transactions'],
    render(el, ctx) {
      const rows = ctx.biggestExpenses || [];
      el.innerHTML = rows.length
        ? `<div class="w-list">${rows.map(x => listRow(
            `<span class="fs-12" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
              <i class="ph ${esc(x.categories?.icon || 'ph-tag')}" style="color:${esc(x.categories?.color || 'var(--accent)')}"></i>
              ${esc(x.description || x.categories?.name || '')} <span class="text-dim">· ${x.date.slice(8, 10)}/${x.date.slice(5, 7)}</span></span>`,
            `<span class="fw-600 money text-down" style="flex-shrink:0;margin-left:8px">-${formatMoney(x.amount, 'EUR', 0)}</span>`)).join('')}</div>`
        : `<div class="empty">${t('No spending this month.')}</div>`;
    },
  },

  'top-merchants': {
    title: 'Top merchants', section: 'solo', minW: 2, minH: 2,
    desc: 'Where the money went: the 5 places you spent the most over the last 3 months, grouped by description.',
    tags: ['list', 'spending', 'transactions'],
    render(el, ctx) {
      const rows = ctx.topMerchants || [];
      el.innerHTML = rows.length
        ? `<div class="w-list">${rows.map(m => listRow(
            `<span class="fs-12" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(m.name)} <span class="text-dim">· ${m.count}×</span></span>`,
            `<span class="fw-600 money" style="flex-shrink:0;margin-left:8px">${formatMoney(m.amount, 'EUR', 0)}</span>`)).join('')}</div>`
        : `<div class="empty">${t('No expenses in the last 3 months.')}</div>`;
    },
  },

  'subscriptions': {
    title: 'Subscriptions', section: 'solo', minW: 2, minH: 2,
    desc: 'Recurring charges detected automatically: same description and amount (±5%) in at least 3 of the last 4 months.',
    tags: ['list', 'subscriptions', 'spending'],
    render(el, ctx) {
      const subs = ctx.subscriptions || { list: [], monthlyTotal: 0 };
      el.innerHTML = subs.list.length
        ? `<div class="w-list">${subs.list.map(s => listRow(
            `<span class="fs-12" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1"><i class="ph ph-repeat" style="color:var(--accent)"></i> ${esc(s.name)}</span>`,
            `<span class="fw-600 money" style="flex-shrink:0;margin-left:8px">${formatMoney(s.amount)}</span>`)).join('')}</div>
          <div class="flex-between" style="padding-top:8px;border-top:2px solid var(--border)">
            <span class="fs-12 fw-600">${t('Monthly total')}</span>
            <span class="fw-600 money text-down">${formatMoney(subs.monthlyTotal)}</span></div>`
        : `<div class="empty">${t('No recurring charges detected yet.')}</div>`;
    },
  },

  'stock-movers': {
    title: 'Stock movers', section: 'solo', minW: 2, minH: 2,
    desc: 'Your holdings ranked by percentage gain since purchase — best performers on top.',
    tags: ['list', 'stocks'],
    render(el, ctx) {
      const rows = [...(ctx.holdings || [])].sort((a, b) => b.gainPct - a.gainPct);
      el.innerHTML = rows.length
        ? `<div class="w-list">${rows.map(h => listRow(
            `<span class="fs-12 fw-600">${esc(h.ticker)}</span>`,
            `<span class="fs-12 fw-600 money ${h.gainPct >= 0 ? 'text-up' : 'text-down'}">${h.gainPct >= 0 ? '▲' : '▼'} ${h.gainPct >= 0 ? '+' : ''}${h.gainPct.toFixed(1)}%</span>`)).join('')}</div>`
        : `<div class="empty">${t('No holdings.')}</div>`;
    },
  },

  // --- Multiple: need ≥2 profiles; use per-transaction profile_id ---
  'by-person-spending': {
    title: 'Spending by person · this month', section: 'multiple', minW: 2, minH: 2,
    desc: 'This month\'s expenses per profile, as bars in each person\'s colour.',
    tags: ['bars', 'people', 'spending'],
    render(el, ctx) {
      const profs = ctx.profiles || [];
      if (profs.length < 2) return void needsProfiles(el);
      const rows = profs.map(p => ({ p, amt: ctx.monthTx.filter(t => t.type === 'expense' && t.profile_id === p.id).reduce((s, t) => s + parseFloat(t.amount), 0) }));
      const max = Math.max(1, ...rows.map(r => r.amt));
      el.innerHTML = `<div class="cat-bars">${rows.map(({ p, amt }) => `
        <div class="cat-bar">
          <span style="width:14px;height:14px;border-radius:50%;background:${esc(p.color)};display:inline-block"></span>
          <div><div class="fs-12">${esc(p.name)}</div>
            <div class="track"><div class="fill" style="width:${Math.max(6, amt / max * 100)}%;background:${esc(p.color)}"></div></div></div>
          <span class="amt">${formatMoney(amt, 'EUR', 0)}</span>
        </div>`).join('')}</div>`;
    },
  },

  'by-person-net': {
    title: 'Net by person · this month', section: 'multiple', minW: 2, minH: 1,
    desc: 'Each profile\'s net result this month (their income minus their expenses).',
    tags: ['list', 'people'],
    render(el, ctx) {
      const profs = ctx.profiles || [];
      if (profs.length < 2) return void needsProfiles(el);
      el.innerHTML = `<div class="w-list">${profs.map(p => {
        const inc = ctx.monthTx.filter(t => t.type === 'income' && t.profile_id === p.id).reduce((s, t) => s + parseFloat(t.amount), 0);
        const exp = ctx.monthTx.filter(t => t.type === 'expense' && t.profile_id === p.id).reduce((s, t) => s + parseFloat(t.amount), 0);
        const net = inc - exp;
        return listRow(
          `<span class="fs-12"><span style="color:${esc(p.color)}">●</span> ${esc(p.name)}</span>`,
          `<span class="fw-600 money ${net >= 0 ? 'text-up' : 'text-down'}">${net >= 0 ? '+' : ''}${formatMoney(net, 'EUR', 0)}</span>`);
      }).join('')}</div>`;
    },
  },

  'by-person-income': {
    title: 'Income by person · this month', section: 'multiple', minW: 2, minH: 2,
    desc: 'This month\'s income per profile, as bars in each person\'s colour.',
    tags: ['bars', 'people', 'earnings'],
    render(el, ctx) {
      const profs = ctx.profiles || [];
      if (profs.length < 2) return void needsProfiles(el);
      const rows = profs.map(p => ({ p, amt: ctx.monthTx.filter(t => t.type === 'income' && t.profile_id === p.id).reduce((s, t) => s + parseFloat(t.amount), 0) }));
      const max = Math.max(1, ...rows.map(r => r.amt));
      el.innerHTML = `<div class="cat-bars">${rows.map(({ p, amt }) => `
        <div class="cat-bar">
          <span style="width:14px;height:14px;border-radius:50%;background:${esc(p.color)};display:inline-block"></span>
          <div><div class="fs-12">${esc(p.name)}</div>
            <div class="track"><div class="fill" style="width:${Math.max(6, amt / max * 100)}%;background:${esc(p.color)}"></div></div></div>
          <span class="amt">${formatMoney(amt, 'EUR', 0)}</span>
        </div>`).join('')}</div>`;
    },
  },

  'by-person-trend': {
    title: 'Spending by person · 6 months', section: 'multiple', minW: 2, minH: 2,
    desc: 'One line per profile with their monthly expenses over the last 6 months, in each person\'s colour.',
    tags: ['chart', 'line', 'people', 'spending'],
    render(el, ctx) {
      const profs = ctx.profiles || [];
      if (profs.length < 2) return void needsProfiles(el);
      el.innerHTML = chartBox();
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: {
          labels: ctx.monthLabels,
          datasets: profs.map(p => ({
            label: p.name,
            data: ctx.months.map(m => ctx.transactions
              .filter(t => t.type === 'expense' && t.profile_id === p.id && t.date.startsWith(m))
              .reduce((s, t) => s + parseFloat(t.amount), 0)),
            borderColor: p.color, backgroundColor: p.color, borderWidth: 2, tension: .3, pointRadius: 2,
          })),
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { boxWidth: 10, font: { size: 10 }, color: TICK } } }, scales: axis(ctx) },
      }));
    },
  },
};
