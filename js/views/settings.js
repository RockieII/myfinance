// MyFinance — Settings View
// Profiles, categories, data export, help, language, session, developer tools.
// (Bank accounts moved to the Data page's Accounts tab — see views/accounts.js.)

import * as DB from '../db.js';
import { signOut } from '../auth.js';
import { DEV_TOOLS } from '../config.js';
import { generateTestData, wipeTestData } from '../seed-data.js';
import { t, getLang, setLang, LANGS } from '../i18n.js';

let profiles = [];
let editingProfileId = null;

const PROFILE_COLORS = ['#1E7F5C', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#6B7280'];

export async function renderSettings(container) {
  profiles = await DB.getAll('profiles', { order: 'name', ascending: true });
  editingProfileId = null;
  draw(container);
}

function draw(container) {
  container.innerHTML = `
    <h3 class="section-title">${t('Profiles')} <span class="text-dim" style="text-transform:none;letter-spacing:0">· ${t('share this account')}</span></h3>
    <div id="profile-form-area"></div>
    ${profiles.length
      ? `<div class="card">${profiles.map(profileRow).join('')}</div>`
      : `<div class="empty" style="padding:16px">${t('No profiles yet. Add one per person (e.g. for a couple) to track who spent what — everything stays in this one account.')}</div>`}
    <button class="btn btn-primary mt-12" id="add-profile-btn">${t('+ Add Profile')}</button>

    <h3 class="section-title" style="margin-top:32px">${t('Categories')}</h3>
    <div class="card">
      <button class="btn btn-outline" id="cats-btn" style="width:100%">${t('Manage categories')} ▸</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">${t('Data')}</h3>
    <div class="card">
      <button class="btn btn-outline" id="export-btn" style="width:100%">${t('Export Transactions (CSV)')}</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">${t('Language')}</h3>
    <div class="card">
      <div class="tab-toggle">
        ${Object.entries(LANGS).map(([code, label]) =>
          `<button class="toggle-btn ${getLang() === code ? 'active' : ''}" data-lang="${code}">${label}</button>`).join('')}
      </div>
    </div>

    <h3 class="section-title" style="margin-top:32px">${t('Help')}</h3>
    <div class="card">
      <button class="btn btn-outline" id="help-btn" style="width:100%">${t('Help & FAQ')} ▸</button>
    </div>

    <h3 class="section-title" style="margin-top:32px">${t('Session')}</h3>
    <div class="card">
      <button class="btn btn-danger" id="signout-btn" style="width:100%">${t('Sign Out')}</button>
    </div>

    ${DEV_TOOLS ? `
      <h3 class="section-title" style="margin-top:32px">${t('Developer')}</h3>
      <div class="card">
        <div class="fs-12 text-dim mb-12">${t('Fills your account with <strong>[TEST]</strong>-tagged dummy data (3 accounts, 24 months, sample stocks). Wipe removes only tagged data — real records are never touched.')}</div>
        <button class="btn btn-outline" id="gen-data-btn" style="width:100%">${t('Generate test data')}</button>
        <button class="btn btn-danger" id="wipe-data-btn" style="width:100%;margin-top:8px">${t('Wipe test data')}</button>
      </div>
    ` : ''}
  `;

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
      if (!confirm(t('Delete this profile? Its transactions stay, but become unassigned (shared).'))) return;
      try {
        await DB.remove('profiles', btn.dataset.deleteProfile);
        await window.refreshProfiles?.();
        showToast(t('Profile deleted'));
        await renderSettings(container);
      } catch (err) { showToast(t('Cannot delete: {msg}', { msg: err.message })); }
    });
  });

  // Language chips — persist + full reload so every view/chart re-renders in the new language.
  container.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === getLang()) return;
      setLang(btn.dataset.lang);
      location.reload();
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
      if (!confirm(t('Generate 24 months of [TEST] dummy data (accounts, transactions, stocks)?'))) return;
      genBtn.disabled = true;
      const label = genBtn.textContent;
      genBtn.textContent = t('Generating…');
      try {
        const r = await generateTestData();
        showToast(t('Added {t} transactions, {a} accounts, {s} stocks', { t: r.transactions, a: r.accounts, s: r.stocks }));
        await renderSettings(container);
      } catch (err) {
        showToast(t('Generate failed: {msg}', { msg: err.message }));
        genBtn.disabled = false;
        genBtn.textContent = label;
      }
    });

    const wipeBtn = container.querySelector('#wipe-data-btn');
    wipeBtn.addEventListener('click', async () => {
      if (!confirm(t('Delete ALL [TEST] dummy data? Real records are not affected.'))) return;
      wipeBtn.disabled = true;
      try {
        const r = await wipeTestData();
        showToast(t('Wiped {a} test accounts + {s} stocks', { a: r.accounts, s: r.stocks }));
        await renderSettings(container);
      } catch (err) {
        showToast(t('Wipe failed: {msg}', { msg: err.message }));
        wipeBtn.disabled = false;
      }
    });
  }
}

function profileRow(p) {
  return `
    <div class="row flex-between">
      <div class="flex gap-8" style="align-items:center">
        <span style="width:14px;height:14px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0"></span>
        <span class="fw-600">${p.name}</span>
      </div>
      <div class="flex gap-8" style="align-items:center">
        <button data-edit-profile="${p.id}" class="btn-icon" title="${t('Edit')}"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete-profile="${p.id}" class="btn-icon" title="${t('Delete')}"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `;
}

function showProfileForm(container, p) {
  const area = container.querySelector('#profile-form-area');
  const current = p.color || PROFILE_COLORS[0];
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingProfileId ? t('Edit Profile') : t('New Profile')}</h3>
      <form id="profile-form">
        <div class="form-group">
          <label>${t('Name')}</label>
          <input id="pf-name" class="form-control" value="${p.name}" placeholder="${t('e.g. Alex')}" required>
        </div>
        <div class="form-group">
          <label>${t('Colour')}</label>
          <div class="icon-grid">
            ${PROFILE_COLORS.map(c => `<button type="button" class="color-pick ${c === current ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
          </div>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingProfileId ? t('Save') : t('Create')}</button>
          <button type="button" class="btn btn-outline" id="pf-cancel">${t('Cancel')}</button>
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
      if (editingProfileId) { await DB.update('profiles', editingProfileId, data); showToast(t('Profile updated')); }
      else { await DB.create('profiles', data); showToast(t('Profile created')); }
      await window.refreshProfiles?.();
      await renderSettings(container);
    } catch (err) { showToast(t('Error: {msg}', { msg: err.message })); }
  });
}

async function exportCSV() {
  try {
    const txs = await DB.getTransactionsWithDetails();
    if (!txs.length) { showToast(t('No transactions to export')); return; }

    const header = 'Date,Type,Category,Account,Amount,Description';   // CSV columns stay English
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
    showToast(t('CSV exported'));
  } catch (err) {
    showToast(t('Export failed: {msg}', { msg: err.message }));
  }
}
