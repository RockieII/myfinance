// MyFinance — Transactions View
// Full CRUD for income and expense entries, with filters.

import * as DB from '../db.js';

let transactions = [];
let categories = [];
let accounts = [];
let editingId = null;
let filters = { month: '', type: '', category_id: '', account_id: '' };

export async function renderTransactions(container) {
  [transactions, categories, accounts] = await Promise.all([
    DB.getTransactionsWithDetails(),
    DB.getAll('categories', { order: 'name', ascending: true }),
    DB.getAll('accounts', { order: 'name', ascending: true }),
  ]);
  editingId = null;
  draw(container);
}

function draw(container) {
  const months = getUniqueMonths(transactions);
  const filtered = applyFilters(transactions);

  container.innerHTML = `
    <div class="flex-between mb-12">
      <span class="fs-12 text-dim">${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}</span>
      <button class="btn btn-primary btn-sm" id="add-tx-btn">+ Add</button>
    </div>

    <div id="tx-form-area"></div>

    <!-- Filters -->
    <div class="filter-row mb-12">
      <select id="f-month" class="form-control filter-select">
        <option value="">All months</option>
        ${months.map(m => `<option value="${m}" ${filters.month === m ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
      <select id="f-type" class="form-control filter-select">
        <option value="">All types</option>
        <option value="income" ${filters.type === 'income' ? 'selected' : ''}>Income</option>
        <option value="expense" ${filters.type === 'expense' ? 'selected' : ''}>Expense</option>
      </select>
      <select id="f-category" class="form-control filter-select">
        <option value="">All categories</option>
        ${categories.map(c => `<option value="${c.id}" ${filters.category_id === c.id ? 'selected' : ''}>${c.name} (${c.type})</option>`).join('')}
      </select>
      <select id="f-account" class="form-control filter-select">
        <option value="">All accounts</option>
        ${accounts.map(a => `<option value="${a.id}" ${filters.account_id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
    </div>

    <!-- Transaction list -->
    ${filtered.length ? `
      <div class="card" style="padding:0">
        ${filtered.map(txRow).join('')}
      </div>
    ` : '<div class="empty">No transactions found.</div>'}
  `;

  // Filter handlers
  ['f-month', 'f-type', 'f-category', 'f-account'].forEach(id => {
    container.querySelector('#' + id).addEventListener('change', (e) => {
      const key = { 'f-month': 'month', 'f-type': 'type', 'f-category': 'category_id', 'f-account': 'account_id' }[id];
      filters[key] = e.target.value;
      draw(container);
    });
  });

  // Add
  container.querySelector('#add-tx-btn').addEventListener('click', () => {
    editingId = null;
    showForm(container, {
      type: 'expense',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      category_id: categories.find(c => c.type === 'expense')?.id || '',
      account_id: accounts[0]?.id || '',
    });
  });

  // Edit
  container.querySelectorAll('[data-edit-tx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = transactions.find(t => t.id === btn.dataset.editTx);
      if (tx) {
        editingId = tx.id;
        showForm(container, tx);
      }
    });
  });

  // Delete
  container.querySelectorAll('[data-delete-tx]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this transaction?')) return;
      try {
        await DB.remove('transactions', btn.dataset.deleteTx);
        showToast('Transaction deleted');
        await renderTransactions(container);
      } catch (err) {
        showToast('Error: ' + err.message);
      }
    });
  });
}

function txRow(tx) {
  const isIncome = tx.type === 'income';
  const sign = isIncome ? '+' : '-';
  const colorClass = isIncome ? 'text-ok' : 'text-danger';
  const catName = tx.categories?.name || '';
  const catIcon = tx.categories?.icon || 'ph-tag';
  const accName = tx.accounts?.name || '';

  return `
    <div class="row" style="padding:12px 16px">
      <i class="ph ${catIcon}" style="font-size:18px;color:var(--accent);width:24px;text-align:center;flex-shrink:0"></i>
      <div style="flex:1;min-width:0">
        <div class="fw-600" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tx.description || catName}</div>
        <div class="fs-12 text-dim">${tx.date} &middot; ${accName}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="fw-600 ${colorClass}">${sign}${formatMoney(tx.amount)}</div>
        <div class="fs-12 text-dim">${catName}</div>
      </div>
      <div class="flex gap-8" style="flex-shrink:0;margin-left:8px">
        <button data-edit-tx="${tx.id}" class="btn-icon" title="Edit"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-tx="${tx.id}" class="btn-icon" title="Delete"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showForm(container, tx) {
  const area = container.querySelector('#tx-form-area');
  const currentType = tx.type || 'expense';
  const filteredCats = categories.filter(c => c.type === currentType);

  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? 'Edit' : 'New'} Transaction</h3>
      <form id="tx-form">
        <div class="form-group">
          <label>Type</label>
          <select id="tx-type" class="form-control">
            <option value="expense" ${currentType === 'expense' ? 'selected' : ''}>Expense</option>
            <option value="income" ${currentType === 'income' ? 'selected' : ''}>Income</option>
          </select>
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input id="tx-amount" type="number" step="0.01" min="0.01" class="form-control" value="${tx.amount || ''}" placeholder="0.00" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="tx-category" class="form-control">
            ${filteredCats.map(c => `<option value="${c.id}" ${c.id === tx.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Account</label>
          <select id="tx-account" class="form-control">
            ${accounts.map(a => `<option value="${a.id}" ${a.id === tx.account_id ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input id="tx-date" type="date" class="form-control" value="${tx.date}" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input id="tx-desc" class="form-control" value="${tx.description || ''}" placeholder="Optional note">
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? 'Save' : 'Add'}</button>
          <button type="button" class="btn btn-outline" id="tx-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Update category dropdown when type changes
  area.querySelector('#tx-type').addEventListener('change', (e) => {
    const newType = e.target.value;
    const cats = categories.filter(c => c.type === newType);
    const catSelect = area.querySelector('#tx-category');
    catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });

  area.querySelector('#tx-cancel').addEventListener('click', () => { area.innerHTML = ''; });

  area.querySelector('#tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      type: document.getElementById('tx-type').value,
      amount: parseFloat(document.getElementById('tx-amount').value),
      category_id: document.getElementById('tx-category').value,
      account_id: document.getElementById('tx-account').value,
      date: document.getElementById('tx-date').value,
      description: document.getElementById('tx-desc').value.trim(),
    };
    try {
      if (editingId) {
        await DB.update('transactions', editingId, data);
        showToast('Transaction updated');
      } else {
        await DB.create('transactions', data);
        showToast('Transaction added');
      }
      await renderTransactions(container);
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  });
}

function applyFilters(txs) {
  return txs.filter(t => {
    if (filters.month && !t.date.startsWith(filters.month)) return false;
    if (filters.type && t.type !== filters.type) return false;
    if (filters.category_id && t.category_id !== filters.category_id) return false;
    if (filters.account_id && t.account_id !== filters.account_id) return false;
    return true;
  });
}

function getUniqueMonths(txs) {
  const set = new Set(txs.map(t => t.date.slice(0, 7)));
  return [...set].sort().reverse();
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
