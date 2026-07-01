// MyFinance — Widget registry
// Each widget: { title, section, minW, minH, render(bodyEl, ctx) }.
//   section: 'solo' (single dimension) or 'multiple' (per-profile — added in a later phase).
//   minW/minH: minimum size in grid cells. Widgets adapt to whatever size the grid gives them.
// Charts must register via ctx.addChart(chart) so the engine can destroy them on re-render.

import { formatMoney } from '../format.js';

const ACCENT = '#1E7F5C';
const GRID = '#E2E6EC';
const TICK = '#6B7280';

export const WIDGETS = {
  'net-worth': {
    title: 'Net Worth', section: 'solo', minW: 2, minH: 1,
    render(el, ctx) {
      el.innerHTML = `
        <div class="w-value money">${formatMoney(ctx.netWorth, 'EUR', 0)}</div>
        <div class="fs-12 ${ctx.trendPct >= 0 ? 'text-up' : 'text-down'}" style="margin-bottom:6px">
          ${ctx.trendPct >= 0 ? '▲' : '▼'} ${Math.abs(ctx.trendPct).toFixed(1)}% this month</div>
        <div class="chart-box" style="flex:1;min-height:0"><canvas></canvas></div>`;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: { labels: ctx.series.map(() => ''), datasets: [{ data: ctx.series, borderColor: ACCENT, borderWidth: 2, fill: true, backgroundColor: 'rgba(30,127,92,.12)', tension: .35, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
      }));
    },
  },

  'cash-flow': {
    title: 'Cash Flow · this month', section: 'solo', minW: 2, minH: 1,
    render(el, ctx) {
      el.innerHTML = `
        <div class="w-stats">
          <div><span class="w-lbl">In</span><span class="w-num money text-up">${formatMoney(ctx.monthIncome, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">Out</span><span class="w-num money text-down">${formatMoney(ctx.monthExpense, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">Net</span><span class="w-num money ${ctx.net >= 0 ? 'text-up' : 'text-down'}">${ctx.net >= 0 ? '+' : ''}${formatMoney(ctx.net, 'EUR', 0)}</span></div>
          <div><span class="w-lbl">Savings</span><span class="w-num ${ctx.savingsRate >= 0 ? 'text-up' : 'text-down'}">${ctx.savingsRate.toFixed(0)}%</span></div>
        </div>`;
    },
  },

  'spending': {
    title: 'Top Spending · this month', section: 'solo', minW: 2, minH: 2,
    render(el, ctx) {
      el.innerHTML = ctx.topCats.length
        ? `<div class="cat-bars">${ctx.topCats.map(([name, c]) => `
            <div class="cat-bar">
              <i class="ph ${c.icon}" style="color:${c.color}"></i>
              <div><div class="fs-12">${name}</div>
                <div class="track"><div class="fill" style="width:${Math.max(6, c.amount / ctx.maxCat * 100)}%;background:${c.color}"></div></div></div>
              <span class="amt">${formatMoney(c.amount, 'EUR', 0)}</span>
            </div>`).join('')}</div>`
        : '<div class="empty">No spending this month.</div>';
    },
  },

  'trend': {
    title: 'Net Worth · 6 months', section: 'solo', minW: 2, minH: 2,
    render(el, ctx) {
      el.innerHTML = `<div class="chart-box" style="flex:1;min-height:0"><canvas></canvas></div>`;
      ctx.addChart(new Chart(el.querySelector('canvas'), {
        type: 'line',
        data: { labels: ctx.monthLabels, datasets: [{ data: ctx.series, borderColor: ACCENT, backgroundColor: 'rgba(30,127,92,.10)', fill: true, tension: .3, pointRadius: 2, pointBackgroundColor: ACCENT }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: TICK, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: TICK, font: { size: 9 }, maxTicksLimit: 4 }, grid: { color: GRID } } } },
      }));
    },
  },

  'savings': {
    title: 'Savings Rate', section: 'solo', minW: 1, minH: 1,
    render(el, ctx) {
      const r = ctx.savingsRate;
      el.innerHTML = `<div class="w-center">
        <div class="w-value ${r >= 0 ? 'text-up' : 'text-down'}">${r.toFixed(0)}%</div>
        <div class="fs-12 text-dim">saved this month</div></div>`;
    },
  },

  'accounts': {
    title: 'Accounts', section: 'solo', minW: 2, minH: 2,
    render(el, ctx) {
      el.innerHTML = ctx.accountBalances.length
        ? `<div class="w-list">${ctx.accountBalances.map(a => `
            <div class="flex-between" style="padding:5px 0;border-bottom:1px solid var(--border)">
              <span class="fs-12">${a.name}</span>
              <span class="fw-600 money">${formatMoney(a.balance, a.currency || 'EUR', 0)}</span>
            </div>`).join('')}</div>`
        : '<div class="empty">No accounts.</div>';
    },
  },
};
