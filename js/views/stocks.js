// MyFinance — Stocks View
// Holdings + live prices from Finnhub. No-scroll: summary stays fixed, the
// holdings list paginates, and the add/edit form opens in a sheet.

import * as DB from '../db.js';
import { FINNHUB_API_KEY, STOCK_CACHE_MINUTES } from '../config.js';
import { formatMoney } from '../format.js';
import { openSheet } from '../sheet.js';
import { t } from '../i18n.js';

let stocks = [];
let priceCache = {};
let page = 0;

export async function renderStocks(container) {
  const [stockData, prices] = await Promise.all([
    DB.getAll('stocks', { order: 'ticker', ascending: true }),
    DB.getStockPrices(),
  ]);
  stocks = stockData;
  priceCache = {};
  prices.forEach(p => { priceCache[p.ticker] = p; });
  page = 0;
  draw(container);
}

function draw(container) {
  const totalInvested = stocks.reduce((s, st) => s + st.quantity * st.purchase_price, 0);
  const totalCurrent = stocks.reduce((s, st) => s + st.quantity * (priceCache[st.ticker]?.price || st.purchase_price), 0);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const gainClass = totalGain >= 0 ? 'text-up' : 'text-down';

  container.innerHTML = `
    <div class="card mb-12">
      <div class="flex-between">
        <div>
          <div class="fs-12 text-dim">${t('Portfolio Value')}</div>
          <div class="fs-24 fw-600 money">${formatMoney(totalCurrent)}</div>
        </div>
        <div style="text-align:right">
          <div class="fs-12 text-dim">${t('Total Gain/Loss')}</div>
          <div class="fw-600 money ${gainClass}">${totalGain >= 0 ? '+' : ''}${formatMoney(totalGain)} (${gainPct.toFixed(1)}%)</div>
        </div>
      </div>
    </div>

    <div class="flex-between mb-12">
      <button class="btn btn-outline btn-sm" id="refresh-btn"><i class="ph ph-arrows-clockwise"></i> ${t('Refresh')}</button>
      <button class="btn btn-primary btn-sm" id="add-stock-btn">${t('+ Add Holding')}</button>
    </div>

    <div class="list-panel">
      <div class="list-region" id="stock-list"></div>
      <div class="pager" id="stock-pager"></div>
    </div>
  `;

  container.querySelector('#refresh-btn').addEventListener('click', () => refreshAllPrices(container));
  container.querySelector('#add-stock-btn').addEventListener('click', () => {
    openStockForm(container, null, {
      ticker: '', name: '', quantity: '', purchase_price: '',
      purchase_date: new Date().toISOString().slice(0, 10), currency: 'USD',
    });
  });

  renderPage(container);
}

function renderPage(container) {
  const region = container.querySelector('#stock-list');

  const paint = (n) => {
    const pages = Math.max(1, Math.ceil(stocks.length / n));
    page = Math.min(page, pages - 1);
    const slice = stocks.slice(page * n, page * n + n);
    region.innerHTML = stocks.length
      ? `<div class="card" style="padding:0">${slice.map(stockRow).join('')}</div>`
      : `<div class="empty">${t('No stock holdings yet.')}</div>`;
    return pages;
  };

  // Estimate rows-per-page, then correct from the real row height so the last row never clips.
  let perPage = Math.max(3, Math.floor(region.clientHeight / 66));
  let pages = paint(perPage);
  const sample = region.querySelector('.row');
  if (sample) {
    const fit = Math.max(3, Math.floor(region.clientHeight / (sample.offsetHeight + 2)));
    if (fit !== perPage) { perPage = fit; pages = paint(perPage); }
  }

  region.querySelectorAll('[data-edit-stock]').forEach(btn => {
    btn.addEventListener('click', () => {
      const st = stocks.find(s => s.id === btn.dataset.editStock);
      if (st) openStockForm(container, st.id, st);
    });
  });
  region.querySelectorAll('[data-delete-stock]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('Delete this holding?'))) return;
      try {
        await DB.remove('stocks', btn.dataset.deleteStock);
        showToast(t('Holding deleted'));
        await renderStocks(container);
      } catch (err) { showToast(t('Error: {msg}', { msg: err.message })); }
    });
  });

  const pager = container.querySelector('#stock-pager');
  pager.innerHTML = stocks.length > perPage
    ? `<button id="pg-prev" ${page === 0 ? 'disabled' : ''}>◂ ${t('Prev')}</button>
       <span>${t('Page {p} / {n}', { p: page + 1, n: pages })}</span>
       <button id="pg-next" ${page >= pages - 1 ? 'disabled' : ''}>${t('Next')} ▸</button>`
    : '';
  pager.querySelector('#pg-prev')?.addEventListener('click', () => { page--; renderPage(container); });
  pager.querySelector('#pg-next')?.addEventListener('click', () => { page++; renderPage(container); });
}

function stockRow(st) {
  const cached = priceCache[st.ticker];
  const currentPrice = cached?.price || null;
  const changePct = cached?.change_pct || 0;
  const stale = cached ? isStale(cached.fetched_at) : true;

  const totalCost = st.quantity * st.purchase_price;
  const totalValue = currentPrice ? st.quantity * currentPrice : null;
  const gain = totalValue !== null ? totalValue - totalCost : null;
  const gainPct = gain !== null && totalCost > 0 ? (gain / totalCost) * 100 : null;
  const gainClass = gain !== null ? (gain >= 0 ? 'text-up' : 'text-down') : 'text-dim';

  return `
    <div class="row" style="padding:11px 16px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px">
        <div class="fw-600">${st.ticker}</div>
        <div class="fs-12 text-dim">${st.name || st.ticker} &middot; ${t('{n} shares', { n: st.quantity })}</div>
      </div>
      <div style="text-align:right;min-width:100px">
        ${currentPrice !== null ? `
          <div class="fw-600 money">${formatMoney(currentPrice, st.currency)}</div>
          <div class="fs-12 ${changePct >= 0 ? 'text-up' : 'text-down'}">${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%${stale ? ` <span class="text-dim">(${t('stale')})</span>` : ''}</div>
        ` : `<div class="text-dim fs-12">${t('No price data')}</div>`}
      </div>
      <div style="text-align:right;min-width:100px">
        ${gain !== null ? `
          <div class="fw-600 money ${gainClass}">${gain >= 0 ? '+' : ''}${formatMoney(gain, st.currency)}</div>
          <div class="fs-12 ${gainClass}">${gainPct.toFixed(1)}%</div>
        ` : `<div class="text-dim fs-12">${t('Avg')} ${formatMoney(st.purchase_price, st.currency)}</div>`}
      </div>
      <div class="flex gap-8" style="flex-shrink:0">
        <button data-edit-stock="${st.id}" class="btn-icon" title="${t('Edit')}"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-stock="${st.id}" class="btn-icon" title="${t('Delete')}"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function openStockForm(container, editingId, st) {
  const { el, close } = openSheet(`
    <h3>${editingId ? t('Edit Holding') : t('New Holding')}</h3>
    <form id="stock-form">
      <div class="form-group">
        <label>${t('Ticker')}</label>
        <input id="st-ticker" class="form-control" value="${st.ticker}" placeholder="${t('e.g. AAPL, VWCE.DE')}" required style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label>${t('Name')}</label>
        <input id="st-name" class="form-control" value="${st.name || ''}" placeholder="${t('e.g. Apple Inc.')}">
      </div>
      <div class="form-group">
        <label>${t('Shares')}</label>
        <input id="st-qty" type="number" step="0.0001" min="0.0001" class="form-control" value="${st.quantity || ''}" required>
      </div>
      <div class="form-group">
        <label>${t('Avg. Purchase Price')}</label>
        <input id="st-price" type="number" step="0.0001" min="0" class="form-control" value="${st.purchase_price || ''}" required>
      </div>
      <div class="form-group">
        <label>${t('Purchase Date')}</label>
        <input id="st-date" type="date" class="form-control" value="${st.purchase_date}">
      </div>
      <div class="form-group">
        <label>${t('Currency')}</label>
        <select id="st-currency" class="form-control">
          <option value="USD" ${st.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${st.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="GBP" ${st.currency === 'GBP' ? 'selected' : ''}>GBP</option>
        </select>
      </div>
      <div class="flex gap-8">
        <button type="submit" class="btn btn-primary">${editingId ? t('Save') : t('Add')}</button>
        <button type="button" class="btn btn-outline" id="st-cancel">${t('Cancel')}</button>
      </div>
    </form>
  `);

  el.querySelector('#st-cancel').addEventListener('click', close);
  el.querySelector('#stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      ticker: el.querySelector('#st-ticker').value.trim().toUpperCase(),
      name: el.querySelector('#st-name').value.trim(),
      quantity: parseFloat(el.querySelector('#st-qty').value),
      purchase_price: parseFloat(el.querySelector('#st-price').value),
      purchase_date: el.querySelector('#st-date').value,
      currency: el.querySelector('#st-currency').value,
    };
    try {
      if (editingId) {
        await DB.update('stocks', editingId, data);
        showToast(t('Holding updated'));
      } else {
        await DB.create('stocks', data);
        showToast(t('Holding added'));
      }
      close();
      await renderStocks(container);
    } catch (err) { showToast(t('Error: {msg}', { msg: err.message })); }
  });
}

async function refreshAllPrices(container) {
  const tickers = [...new Set(stocks.map(s => s.ticker))];
  if (!tickers.length) { showToast(t('No stocks to refresh')); return; }

  showToast(t('Fetching prices...'));
  let updated = 0;
  for (const ticker of tickers) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`);
      const data = await res.json();
      if (data.c && data.c > 0) {
        await DB.upsertStockPrice(ticker, data.c, data.dp || 0);
        updated++;
      }
    } catch (err) {
      console.warn(`Failed to fetch ${ticker}:`, err);
    }
  }
  showToast(t('Updated {u}/{n} prices', { u: updated, n: tickers.length }));
  await renderStocks(container);
}

function isStale(fetchedAt) {
  if (!fetchedAt) return true;
  return (Date.now() - new Date(fetchedAt).getTime()) / 60000 > STOCK_CACHE_MINUTES;
}
