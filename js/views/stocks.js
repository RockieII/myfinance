// MyFinance — Stocks View
// Manage stock holdings and fetch live prices from Finnhub.

import * as DB from '../db.js';
import { FINNHUB_API_KEY, STOCK_CACHE_MINUTES } from '../config.js';

let stocks = [];
let priceCache = {};
let editingId = null;

export async function renderStocks(container) {
  const [stockData, prices] = await Promise.all([
    DB.getAll('stocks', { order: 'ticker', ascending: true }),
    DB.getStockPrices(),
  ]);
  stocks = stockData;
  priceCache = {};
  prices.forEach(p => { priceCache[p.ticker] = p; });
  editingId = null;
  draw(container);
}

function draw(container) {
  const totalInvested = stocks.reduce((s, st) => s + st.quantity * st.purchase_price, 0);
  const totalCurrent = stocks.reduce((s, st) => {
    const price = priceCache[st.ticker]?.price || st.purchase_price;
    return s + st.quantity * price;
  }, 0);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const gainClass = totalGain >= 0 ? 'text-ok' : 'text-danger';

  container.innerHTML = `
    <!-- Portfolio summary -->
    <div class="card mb-12">
      <div class="flex-between">
        <div>
          <div class="fs-12 text-dim">Portfolio Value</div>
          <div class="fs-24 fw-600">${formatMoney(totalCurrent)}</div>
        </div>
        <div style="text-align:right">
          <div class="fs-12 text-dim">Total Gain/Loss</div>
          <div class="fw-600 ${gainClass}">${totalGain >= 0 ? '+' : ''}${formatMoney(totalGain)} (${gainPct.toFixed(1)}%)</div>
        </div>
      </div>
    </div>

    <div class="flex-between mb-12">
      <button class="btn btn-outline btn-sm" id="refresh-btn"><i class="ph ph-arrows-clockwise"></i> Refresh Prices</button>
      <button class="btn btn-primary btn-sm" id="add-stock-btn">+ Add Holding</button>
    </div>

    <div id="stock-form-area"></div>

    ${stocks.length ? `
      <div class="card" style="padding:0">
        ${stocks.map(stockRow).join('')}
      </div>
    ` : '<div class="empty">No stock holdings yet.</div>'}
  `;

  // Refresh prices
  container.querySelector('#refresh-btn').addEventListener('click', async () => {
    await refreshAllPrices(container);
  });

  // Add
  container.querySelector('#add-stock-btn').addEventListener('click', () => {
    editingId = null;
    showForm(container, {
      ticker: '', name: '', quantity: '', purchase_price: '',
      purchase_date: new Date().toISOString().slice(0, 10), currency: 'USD',
    });
  });

  // Edit
  container.querySelectorAll('[data-edit-stock]').forEach(btn => {
    btn.addEventListener('click', () => {
      const st = stocks.find(s => s.id === btn.dataset.editStock);
      if (st) { editingId = st.id; showForm(container, st); }
    });
  });

  // Delete
  container.querySelectorAll('[data-delete-stock]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this holding?')) return;
      try {
        await DB.remove('stocks', btn.dataset.deleteStock);
        showToast('Holding deleted');
        await renderStocks(container);
      } catch (err) { showToast('Error: ' + err.message); }
    });
  });
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
  const gainClass = gain !== null ? (gain >= 0 ? 'text-ok' : 'text-danger') : 'text-dim';

  return `
    <div class="row" style="padding:12px 16px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px">
        <div class="fw-600">${st.ticker}</div>
        <div class="fs-12 text-dim">${st.name || st.ticker} &middot; ${st.quantity} shares</div>
      </div>
      <div style="text-align:right;min-width:100px">
        ${currentPrice !== null ? `
          <div class="fw-600">${formatMoney(currentPrice, st.currency)}</div>
          <div class="fs-12 ${changePct >= 0 ? 'text-ok' : 'text-danger'}">${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%${stale ? ' <span class="text-dim">(stale)</span>' : ''}</div>
        ` : '<div class="text-dim fs-12">No price data</div>'}
      </div>
      <div style="text-align:right;min-width:100px">
        ${gain !== null ? `
          <div class="fw-600 ${gainClass}">${gain >= 0 ? '+' : ''}${formatMoney(gain, st.currency)}</div>
          <div class="fs-12 ${gainClass}">${gainPct.toFixed(1)}%</div>
        ` : `<div class="text-dim fs-12">Avg ${formatMoney(st.purchase_price, st.currency)}</div>`}
      </div>
      <div class="flex gap-8" style="flex-shrink:0">
        <button data-edit-stock="${st.id}" class="btn-icon" title="Edit"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-stock="${st.id}" class="btn-icon" title="Delete"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showForm(container, st) {
  const area = container.querySelector('#stock-form-area');
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? 'Edit' : 'New'} Holding</h3>
      <form id="stock-form">
        <div class="form-group">
          <label>Ticker</label>
          <input id="st-ticker" class="form-control" value="${st.ticker}" placeholder="e.g. AAPL, VWCE.DE" required style="text-transform:uppercase">
        </div>
        <div class="form-group">
          <label>Name</label>
          <input id="st-name" class="form-control" value="${st.name || ''}" placeholder="e.g. Apple Inc.">
        </div>
        <div class="form-group">
          <label>Shares</label>
          <input id="st-qty" type="number" step="0.0001" min="0.0001" class="form-control" value="${st.quantity || ''}" required>
        </div>
        <div class="form-group">
          <label>Avg. Purchase Price</label>
          <input id="st-price" type="number" step="0.0001" min="0" class="form-control" value="${st.purchase_price || ''}" required>
        </div>
        <div class="form-group">
          <label>Purchase Date</label>
          <input id="st-date" type="date" class="form-control" value="${st.purchase_date}">
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select id="st-currency" class="form-control">
            <option value="USD" ${st.currency === 'USD' ? 'selected' : ''}>USD</option>
            <option value="EUR" ${st.currency === 'EUR' ? 'selected' : ''}>EUR</option>
            <option value="GBP" ${st.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          </select>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? 'Save' : 'Add'}</button>
          <button type="button" class="btn btn-outline" id="st-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  area.querySelector('#st-cancel').addEventListener('click', () => { area.innerHTML = ''; });

  area.querySelector('#stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      ticker: document.getElementById('st-ticker').value.trim().toUpperCase(),
      name: document.getElementById('st-name').value.trim(),
      quantity: parseFloat(document.getElementById('st-qty').value),
      purchase_price: parseFloat(document.getElementById('st-price').value),
      purchase_date: document.getElementById('st-date').value,
      currency: document.getElementById('st-currency').value,
    };
    try {
      if (editingId) {
        await DB.update('stocks', editingId, data);
        showToast('Holding updated');
      } else {
        await DB.create('stocks', data);
        showToast('Holding added');
      }
      await renderStocks(container);
    } catch (err) { showToast('Error: ' + err.message); }
  });
}

async function refreshAllPrices(container) {
  const tickers = [...new Set(stocks.map(s => s.ticker))];
  if (!tickers.length) { showToast('No stocks to refresh'); return; }

  showToast('Fetching prices...');
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

  showToast(`Updated ${updated}/${tickers.length} prices`);
  await renderStocks(container);
}

function isStale(fetchedAt) {
  if (!fetchedAt) return true;
  const age = (Date.now() - new Date(fetchedAt).getTime()) / 60000;
  return age > STOCK_CACHE_MINUTES;
}

function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}
