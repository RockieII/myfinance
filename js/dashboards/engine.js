// MyFinance — Dashboard engine
// Loads the shared data context once, then renders a layout onto a CSS grid.
// Layout = ordered array of { id, type, w, h } (w/h = span in grid cells). Widgets are
// clamped to their registry min size and to the current column count, and adapt to fill.

import * as DB from '../db.js';
import { WIDGETS } from './registry.js';
import { getProfiles } from '../profiles.js';
import { getTheme } from './themes.js';

export const MAX_H = 6;

// Grid resolution (columns) by width — more cells = finer placement/sizing.
export function getCols() {
  const w = window.innerWidth;
  if (w >= 1100) return 8;
  if (w >= 769) return 6;
  return 4;
}

let charts = [];
let pendingRaf = null;

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

  const accountBalances = accounts.map(a => {
    const at = transactions.filter(t => t.account_id === a.id);
    return { name: a.name, currency: a.currency, balance: parseFloat(a.initial_balance) + sum(at, 'income') - sum(at, 'expense') };
  });

  return {
    transactions, accounts, stocks, priceMap, profiles: getProfiles(), monthTx,
    months, monthLabels: months.map(monthLabel), series, netWorth, trendPct,
    monthIncome, monthExpense, net, savingsRate,
    topCats, maxCat, accountBalances, portfolioValue,
    accent: getTheme('default').accent,   // overridden per-page by the active theme
    font: '',                             // overridden per-page by the active theme
    addChart: () => {},
  };
}

export function renderGrid(container, layout, ctx, opts = {}) {
  const { editing = false, onChange } = opts;
  if (pendingRaf) { cancelAnimationFrame(pendingRaf); pendingRaf = null; }
  charts.forEach(c => { try { c.destroy(); } catch (_) {} });
  charts = [];
  ctx.addChart = (c) => charts.push(c);

  const cols = getCols();
  container.innerHTML = `
    <div class="grid-canvas ${editing ? 'editing' : ''}" style="--cols:${cols}">
      ${layout.map(item => {
        const w = WIDGETS[item.type];
        if (!w) return '';
        const cw = Math.min(Math.max(item.w, w.minW), cols);
        const ch = Math.max(item.h, w.minH);
        return `
          <div class="widget" data-id="${item.id}" style="grid-column:span ${cw};grid-row:span ${ch}">
            <div class="widget-head"><span class="widget-title">${w.title}</span>${editing ? editControls() : ''}</div>
            <div class="widget-body" data-body="${item.id}"></div>
          </div>`;
      }).join('')}
    </div>`;

  // Render bodies after layout so chart canvases have real dimensions.
  // Snapshot the accent/font for this render so a rapid re-render can't repaint with another page's theme.
  const accent = ctx.accent, font = ctx.font;
  pendingRaf = requestAnimationFrame(() => {
    pendingRaf = null;
    ctx.accent = accent; ctx.font = font;
    layout.forEach(item => {
      const w = WIDGETS[item.type];
      const el = container.querySelector(`[data-body="${item.id}"]`);
      if (w && el) { try { w.render(el, ctx); } catch (err) { el.innerHTML = `<div class="empty fs-12">Widget error</div>`; } }
    });
  });

  // Edit controls: resize (span cells) / remove → emit a new layout.
  if (editing && typeof onChange === 'function') {
    container.querySelectorAll('.widget').forEach(wEl => {
      const id = wEl.dataset.id;
      const item = layout.find(x => x.id === id);
      if (!item) return;
      const wdef = WIDGETS[item.type];
      wEl.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'rm') { onChange(layout.filter(x => x.id !== id)); return; }
          const next = layout.map(x => ({ ...x }));
          const it = next.find(x => x.id === id);
          if (act === 'w+') it.w = Math.min(cols, (it.w || wdef.minW) + 1);
          if (act === 'w-') it.w = Math.max(wdef.minW, (it.w || wdef.minW) - 1);
          if (act === 'h+') it.h = Math.min(MAX_H, (it.h || wdef.minH) + 1);
          if (act === 'h-') it.h = Math.max(wdef.minH, (it.h || wdef.minH) - 1);
          onChange(next);
        });
      });
    });
  }
}

function editControls() {
  return `<span class="widget-ctrls">
    <button class="wc" data-act="w-" title="Narrower">–W</button>
    <button class="wc" data-act="w+" title="Wider">+W</button>
    <button class="wc" data-act="h-" title="Shorter">–H</button>
    <button class="wc" data-act="h+" title="Taller">+H</button>
    <button class="wc wc-rm" data-act="rm" title="Remove">✕</button>
  </span>`;
}

// Helpers
function sum(txs, type) { return txs.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0); }
function lastMonths(n) {
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
