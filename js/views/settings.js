// MyFinance — Settings View
// Manage bank accounts, export data, sign out.

import * as DB from '../db.js';
import { signOut } from '../auth.js';
import { DEV_TOOLS } from '../config.js';
import { generateTestData, wipeTestData } from '../seed-data.js';
import { formatMoney } from '../format.js';

let accounts = [];
let profiles = [];
let editingId = null;
let editingProfileId = null;

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

const PROFILE_COLORS = ['#1E7F5C', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#6B7280'];

export async function renderSettings(container) {
  [accounts, profiles] = await Promise.all([
    DB.getAll('accounts', { order: 'name', ascending: true }),
    DB.getAll('profiles', { order: 'name', ascending: true }),
  ]);
  editingId = null;
  editingProfileId = null;
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

    <h3 class="section-title" style="margin-top:32px">Profiles <span class="text-dim" style="text-transform:none;letter-spacing:0">· share this account</span></h3>
    <div id="profile-form-area"></div>
    ${profiles.length
      ? `<div class="card">${profiles.map(profileRow).join('')}</div>`
      : '<div class="empty" style="padding:16px">No profiles yet. Add one per person (e.g. for a couple) to track who spent what — everything stays in this one account.</div>'}
    <button class="btn btn-primary mt-12" id="add-profile-btn">+ Add Profile</button>

    <h3 class="section-title" style="margin-top:32px">Categories</h3>
    <div class="card">
      <button class="btn btn-outline" id="cats-btn" style="width:100%">Manage categories ▸</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">Data</h3>
    <div class="card">
      <button class="btn btn-outline" id="export-btn" style="width:100%">Export Transactions (CSV)</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">Help</h3>
    <div class="card">
      <button class="btn btn-outline" id="help-btn" style="width:100%">Help &amp; FAQ ▸</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">Session</h3>
    <div class="card">
      <button class="btn btn-danger" id="signout-btn" style="width:100%">Sign Out</button>
    </div>

    ${DEV_TOOLS ? `
      <h3 class="section-title" style="margin-top:32px">Developer</h3>
      <div class="card">
        <div class="fs-12 text-dim mb-12">Fills your account with <strong>[TEST]</strong>-tagged dummy data
          (3 accounts, 24 months, sample stocks). Wipe removes only tagged data — real records are never touched.</div>
        <button class="btn btn-outline" id="gen-data-btn" style="width:100%">Generate test data</button>
        <button class="btn btn-danger" id="wipe-data-btn" style="width:100%;margin-top:8px">Wipe test data</button>
      </div>
    ` : ''}
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

  // Profiles: add / edit / delete
  container.querySelector('#add-profile-btn').addEventListener('click', () => {
    editingProfileId = null;
    showProfileForm(container, { name: '', color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length] });
  });
  container.querySelectorAll('[data-edit-profile]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = profiles.find(x => x.id === btn.dataset.editProfile);
      if (p) { editingProfileId = p.id; showProfileForm(container, p); }
    });
  });
  container.querySelectorAll('[data-delete-profile]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this profile? Its transactions stay, but become unassigned (shared).')) return;
      try {
        await DB.remove('profiles', btn.dataset.deleteProfile);
        await window.refreshProfiles?.();
        showToast('Profile deleted');
        await renderSettings(container);
      } catch (err) { showToast('Cannot delete: ' + err.message); }
    });
  });

  // Navigate to Categories / Help (reachable from Settings, not the tab bar)
  container.querySelector('#cats-btn').addEventListener('click', () => { location.hash = 'categories'; });
  container.querySelector('#help-btn').addEventListener('click', () => { location.hash = 'help'; });

  // Export
  container.querySelector('#export-btn').addEventListener('click', exportCSV);

  // Sign out
  container.querySelector('#signout-btn').addEventListener('click', async () => {
    await signOut();
    location.reload();
  });

  // Developer: generate / wipe test data
  if (DEV_TOOLS) {
    const genBtn = container.querySelector('#gen-data-btn');
    genBtn.addEventListener('click', async () => {
      if (!confirm('Generate 24 months of [TEST] dummy data (accounts, transactions, stocks)?')) return;
      genBtn.disabled = true;
      const label = genBtn.textContent;
      genBtn.textContent = 'Generating…';
      try {
        const r = await generateTestData();
        showToast(`Added ${r.transactions} transactions, ${r.accounts} accounts, ${r.stocks} stocks`);
        await renderSettings(container);
      } catch (err) {
        showToast('Generate failed: ' + err.message);
        genBtn.disabled = false;
        genBtn.textContent = label;
      }
    });

    const wipeBtn = container.querySelector('#wipe-data-btn');
    wipeBtn.addEventListener('click', async () => {
      if (!confirm('Delete ALL [TEST] dummy data? Real records are not affected.')) return;
      wipeBtn.disabled = true;
      try {
        const r = await wipeTestData();
        showToast(`Wiped ${r.accounts} test accounts + ${r.stocks} stocks`);
        await renderSettings(container);
      } catch (err) {
        showToast('Wipe failed: ' + err.message);
        wipeBtn.disabled = false;
      }
    });
  }
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

function profileRow(p) {
  return `
    <div class="row flex-between">
      <div class="flex gap-8" style="align-items:center">
        <span style="width:14px;height:14px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0"></span>
        <span class="fw-600">${p.name}</span>
      </div>
      <div class="flex gap-8" style="align-items:center">
        <button data-edit-profile="${p.id}" class="btn-icon" title="Edit"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-profile="${p.id}" class="btn-icon" title="Delete"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showProfileForm(container, p) {
  const area = container.querySelector('#profile-form-area');
  const current = p.color || PROFILE_COLORS[0];
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingProfileId ? 'Edit' : 'New'} Profile</h3>
      <form id="profile-form">
        <div class="form-group">
          <label>Name</label>
          <input id="pf-name" class="form-control" value="${p.name}" placeholder="e.g. Alex" required>
        </div>
        <div class="form-group">
          <label>Colour</label>
          <div class="icon-grid">
            ${PROFILE_COLORS.map(c => `<button type="button" class="color-pick ${c === current ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
          </div>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingProfileId ? 'Save' : 'Create'}</button>
          <button type="button" class="btn btn-outline" id="pf-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  let selectedColor = current;
  area.querySelectorAll('.color-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });
  });
  area.querySelector('#pf-cancel').addEventListener('click', () => { area.innerHTML = ''; });
  area.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { name: document.getElementById('pf-name').value.trim(), color: selectedColor };
    if (!data.name) return;
    try {
      if (editingProfileId) { await DB.update('profiles', editingProfileId, data); showToast('Profile updated'); }
      else { await DB.create('profiles', data); showToast('Profile created'); }
      await window.refreshProfiles?.();
      await renderSettings(container);
    } catch (err) { showToast('Error: ' + err.message); }
  });
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

// (money formatting now lives in js/format.js)

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
