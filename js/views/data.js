// MyFinance — Data page
// The single data-entry destination: Transactions, Stocks and Accounts behind a toggle.
// Reuses the existing views, rendered into a sub-container so their pagination/no-scroll
// still works.

import { renderTransactions } from './transactions.js';
import { renderStocks } from './stocks.js';
import { renderAccounts } from './accounts.js';
import { t } from '../i18n.js';

let active = 'transactions';

export async function renderData(container) {
  container.innerHTML = `
    <div class="data-head">
      <div class="tab-toggle">
        <button class="toggle-btn ${active === 'transactions' ? 'active' : ''}" data-d="transactions">${t('Transactions')}</button>
        <button class="toggle-btn ${active === 'stocks' ? 'active' : ''}" data-d="stocks">${t('Stocks')}</button>
        <button class="toggle-btn ${active === 'accounts' ? 'active' : ''}" data-d="accounts">${t('Accounts')}</button>
      </div>
    </div>
    <div class="data-body" id="data-body"></div>
  `;

  container.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
    if (active === b.dataset.d) return;
    active = b.dataset.d;
    renderData(container);
  }));

  const body = container.querySelector('#data-body');
  if (active === 'transactions') await renderTransactions(body);
  else if (active === 'stocks') await renderStocks(body);
  else await renderAccounts(body);
}
