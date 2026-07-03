// MyFinance — Accounts management (Data page tab)
// Bank-account CRUD, extracted from Settings. The Data body is a no-scroll flex
// column, so the whole tab (form + list) scrolls inside its own region.

import * as DB from '../db.js';
import { formatMoney, esc } from '../format.js';
import { t } from '../i18n.js';

let accounts = [];
let editingId = null;

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

export async function renderAccounts(container) {
  accounts = await DB.getAll('accounts', { order: 'name', ascending: true });
  editingId = null;
  draw(container);
}

function draw(container) {
  container.innerHTML = `
    <div style="flex:1;min-height:0;overflow-y:auto">
      <div id="account-form-area"></div>

      ${accounts.length ? `
        <div class="card">
          ${accounts.map(a => accountRow(a)).join('')}
        </div>
      ` : `<div class="empty">${t('No accounts yet. Add your first account.')}</div>`}

      <button class="btn btn-primary mt-12" id="add-account-btn">${t('+ Add Account')}</button>
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
      if (!confirm(t('Delete this account? All its transactions will also be deleted.'))) return;
      try {
        await DB.remove('accounts', btn.dataset.deleteAcc);
        showToast(t('Account deleted'));
        await renderAccounts(container);
      } catch (err) {
        showToast(t('Cannot delete: {msg}', { msg: err.message }));
      }
    });
  });
}

function accountRow(acc) {
  const typeLabel = ACCOUNT_TYPES.find(tp => tp.value === acc.type)?.label || acc.type;
  return `
    <div class="row flex-between">
      <div>
        <div class="fw-600">${esc(acc.name)}</div>
        <div class="fs-12 text-dim">${t(typeLabel)} &middot; ${acc.currency}</div>
      </div>
      <div class="flex gap-8" style="align-items:center">
        <span class="fw-600">${formatMoney(acc.initial_balance, acc.currency)}</span>
        <button data-edit-acc="${acc.id}" class="btn-icon" title="${t('Edit')}"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-acc="${acc.id}" class="btn-icon" title="${t('Delete')}"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showForm(container, acc) {
  const area = container.querySelector('#account-form-area');
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? t('Edit Account') : t('New Account')}</h3>
      <form id="acc-form">
        <div class="form-group">
          <label>${t('Name')}</label>
          <input id="acc-name" class="form-control" value="${esc(acc.name)}" placeholder="${t('e.g. Main Bank')}" required>
        </div>
        <div class="form-group">
          <label>${t('Type')}</label>
          <select id="acc-type" class="form-control">
            ${ACCOUNT_TYPES.map(tp => `<option value="${tp.value}" ${tp.value === acc.type ? 'selected' : ''}>${t(tp.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>${t('Currency')}</label>
          <select id="acc-currency" class="form-control">
            <option value="EUR" ${acc.currency === 'EUR' ? 'selected' : ''}>EUR</option>
            <option value="USD" ${acc.currency === 'USD' ? 'selected' : ''}>USD</option>
            <option value="GBP" ${acc.currency === 'GBP' ? 'selected' : ''}>GBP</option>
          </select>
        </div>
        <div class="form-group">
          <label>${t('Initial Balance')}</label>
          <input id="acc-balance" type="number" step="0.01" class="form-control" value="${acc.initial_balance}">
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? t('Save') : t('Create')}</button>
          <button type="button" class="btn btn-outline" id="acc-cancel">${t('Cancel')}</button>
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
        showToast(t('Account updated'));
      } else {
        await DB.create('accounts', data);
        showToast(t('Account created'));
      }
      await renderAccounts(container);
    } catch (err) {
      showToast(t('Error: {msg}', { msg: err.message }));
    }
  });
}
