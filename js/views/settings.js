// MyFinance — Settings View
// Manage bank accounts, export data, sign out.

import * as DB from '../db.js';
import { signOut } from '../auth.js';

let accounts = [];
let editingId = null;

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

export async function renderSettings(container) {
  accounts = await DB.getAll('accounts', { order: 'name', ascending: true });
  editingId = null;
  draw(container);
}

function draw(container) {
  container.innerHTML = `
    <h3 class="section-title">Accounts</h3>
    <div id="account-form-area"></div>

    ${accounts.length ? `
      <div class="card">
        ${accounts.map(a => accountRow(a)).join('')}
      </div>
    ` : '<div class="empty">No accounts yet. Add your first account.</div>'}

    <button class="btn btn-primary mt-12" id="add-account-btn">+ Add Account</button>

    <h3 class="section-title" style="margin-top:32px">Data</h3>
    <div class="card">
      <button class="btn btn-outline" id="export-btn" style="width:100%">Export Transactions (CSV)</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">Session</h3>
    <div class="card">
      <button class="btn btn-danger" id="signout-btn" style="width:100%">Sign Out</button>
    </div>
  `;

  // Add account
  container.querySelector('#add-account-btn').addEventListener('click', () => {
    editingId = null;
    showForm(container, { name: '', type: 'checking', currency: 'EUR', initial_balance: 0 });
  });

  // Edit/delete
  container.querySelectorAll('[data-edit-acc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = accounts.find(a => a.id === btn.dataset.editAcc);
      if (acc) {
        editingId = acc.id;
        showForm(container, acc);
      }
    });
  });

  container.querySelectorAll('[data-delete-acc]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this account? All its transactions will also be deleted.')) return;
      try {
        await DB.remove('accounts', btn.dataset.deleteAcc);
        showToast('Account deleted');
        await renderSettings(container);
      } catch (err) {
        showToast('Cannot delete: ' + err.message);
      }
    });
  });

  // Export
  container.querySelector('#export-btn').addEventListener('click', exportCSV);

  // Sign out
  container.querySelector('#signout-btn').addEventListener('click', async () => {
    await signOut();
    location.reload();
  });
}

function accountRow(acc) {
  const typeLabel = ACCOUNT_TYPES.find(t => t.value === acc.type)?.label || acc.type;
  return `
    <div class="row flex-between">
      <div>
        <div class="fw-600">${acc.name}</div>
        <div class="fs-12 text-dim">${typeLabel} &middot; ${acc.currency}</div>
      </div>
      <div class="flex gap-8" style="align-items:center">
        <span class="fw-600">${formatMoney(acc.initial_balance, acc.currency)}</span>
        <button data-edit-acc="${acc.id}" class="btn-icon" title="Edit"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-acc="${acc.id}" class="btn-icon" title="Delete"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showForm(container, acc) {
  const area = container.querySelector('#account-form-area');
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? 'Edit' : 'New'} Account</h3>
      <form id="acc-form">
        <div class="form-group">
          <label>Name</label>
          <input id="acc-name" class="form-control" value="${acc.name}" placeholder="e.g. Main Bank" required>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="acc-type" class="form-control">
            ${ACCOUNT_TYPES.map(t => `<option value="${t.value}" ${t.value === acc.type ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Currency</label>
          <select id="acc-currency" class="form-control">
            <option value="EUR" ${acc.currency === 'EUR' ? 'selected' : ''}>EUR</option>
            <option value="USD" ${acc.currency === 'USD' ? 'selected' : ''}>USD</option>
            <option value="GBP" ${acc.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          </select>
        </div>
        <div class="form-group">
          <label>Initial Balance</label>
          <input id="acc-balance" type="number" step="0.01" class="form-control" value="${acc.initial_balance}">
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? 'Save' : 'Create'}</button>
          <button type="button" class="btn btn-outline" id="acc-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  area.querySelector('#acc-cancel').addEventListener('click', () => { area.innerHTML = ''; });

  area.querySelector('#acc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('acc-name').value.trim(),
      type: document.getElementById('acc-type').value,
      currency: document.getElementById('acc-currency').value,
      initial_balance: parseFloat(document.getElementById('acc-balance').value) || 0,
    };
    try {
      if (editingId) {
        await DB.update('accounts', editingId, data);
        showToast('Account updated');
      } else {
        await DB.create('accounts', data);
        showToast('Account created');
      }
      await renderSettings(container);
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  });
}

async function exportCSV() {
  try {
    const txs = await DB.getTransactionsWithDetails();
    if (!txs.length) { showToast('No transactions to export'); return; }

    const header = 'Date,Type,Category,Account,Amount,Description';
    const rows = txs.map(t =>
      `${t.date},${t.type},${t.categories?.name || ''},${t.accounts?.name || ''},${t.amount},"${(t.description || '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfinance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  } catch (err) {
    showToast('Export failed: ' + err.message);
  }
}

function formatMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);
}
