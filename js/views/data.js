// MyFinance — Data page
// The single data-entry destination: Transactions and Stocks behind a toggle. Reuses the
// existing views, rendered into a sub-container so their pagination/no-scroll still works.

import { renderTransactions } from './transactions.js';
import { renderStocks } from './stocks.js';

let active = 'transactions';

export async function renderData(container) {
  container.innerHTML = `
    <div class="data-head">
      <div class="tab-toggle">
        <button class="toggle-btn ${active === 'transactions' ? 'active' : ''}" data-d="transactions">Transactions</button>
        <button class="toggle-btn ${active === 'stocks' ? 'active' : ''}" data-d="stocks">Stocks</button>
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
  else await renderStocks(body);
}
