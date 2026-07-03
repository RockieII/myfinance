// MyFinance — Categories View
// Manage income and expense categories (pre-built + custom).

import * as DB from '../db.js';
import { t } from '../i18n.js';

const ICONS = [
  'ph-house', 'ph-fork-knife', 'ph-car', 'ph-film-strip', 'ph-heart',
  'ph-graduation-cap', 'ph-repeat', 'ph-shopping-bag', 'ph-lightning',
  'ph-wallet', 'ph-laptop', 'ph-chart-line-up', 'ph-gift', 'ph-tag',
  'ph-airplane', 'ph-paw-print', 'ph-baby', 'ph-barbell', 'ph-bank',
  'ph-briefcase', 'ph-coffee', 'ph-game-controller', 'ph-music-note',
  'ph-paint-brush', 'ph-phone', 'ph-pizza', 'ph-shield-check', 'ph-wrench',
  'ph-dots-three',
];

const COLORS = [
  '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6', '#10B981', '#1E7F5C', '#22C55E',
  '#EAB308', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#A855F7', '#8B5CF6', '#6B7280',
];
const DEFAULT_COLOR = '#6B7280';

let categories = [];
let editingId = null;
let filterType = 'expense';

export async function renderCategories(container) {
  categories = await DB.getAll('categories', { order: 'name', ascending: true });
  editingId = null;
  draw(container);
}

function draw(container) {
  const filtered = categories.filter(c => c.type === filterType);
  const customs = filtered.filter(c => !c.is_default);
  const defaults = filtered.filter(c => c.is_default);

  container.innerHTML = `
    <button class="btn btn-outline btn-sm mb-12" id="cat-back">‹ ${t('Settings')}</button>
    <div class="flex-between mb-12">
      <div class="tab-toggle">
        <button class="toggle-btn ${filterType === 'expense' ? 'active' : ''}" data-type="expense">${t('Expenses')}</button>
        <button class="toggle-btn ${filterType === 'income' ? 'active' : ''}" data-type="income">${t('Income')}</button>
      </div>
      <button class="btn btn-primary btn-sm" id="add-cat-btn">${t('+ Add')}</button>
    </div>

    <div id="cat-form-area"></div>

    ${defaults.length ? `
      <h3 class="section-title">${t('Default categories')}</h3>
      <div class="card">
        ${defaults.map(c => catRow(c, false)).join('')}
      </div>
    ` : ''}

    ${customs.length ? `
      <h3 class="section-title">${t('Custom')}</h3>
      <div class="card">
        ${customs.map(c => catRow(c, true)).join('')}
      </div>
    ` : ''}

    ${!defaults.length && !customs.length ? `<div class="empty">${t('No categories yet.')}</div>` : ''}
  `;

  // Back to Settings
  container.querySelector('#cat-back').addEventListener('click', () => { location.hash = 'settings'; });

  // Toggle type
  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterType = btn.dataset.type;
      draw(container);
    });
  });

  // Add button
  container.querySelector('#add-cat-btn').addEventListener('click', () => {
    editingId = null;
    showForm(container, { name: '', type: filterType, icon: 'ph-tag' });
  });

  // Edit/delete buttons
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = categories.find(c => c.id === btn.dataset.edit);
      if (cat) {
        editingId = cat.id;
        showForm(container, cat);
      }
    });
  });

  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('Delete this category? Transactions using it will need reassignment.'))) return;
      try {
        await DB.remove('categories', btn.dataset.delete);
        showToast(t('Category deleted'));
        await renderCategories(container);
      } catch (err) {
        showToast(t('Cannot delete: {msg}', { msg: err.message }));
      }
    });
  });
}

function catRow(cat, editable) {
  return `
    <div class="row">
      <i class="ph ${cat.icon}" style="font-size:20px;color:${cat.color || 'var(--accent)'};width:24px;text-align:center"></i>
      <span style="flex:1">${cat.name}</span>
      ${editable ? `
        <button data-edit="${cat.id}" class="btn-icon" title="${t('Edit')}"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete="${cat.id}" class="btn-icon" title="${t('Delete')}"><i class="ph ph-trash"></i></button>
      ` : ''}
    </div>
  `;
}

function showForm(container, cat) {
  const area = container.querySelector('#cat-form-area');
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? t('Edit Category') : t('New Category')}</h3>
      <form id="cat-form">
        <div class="form-group">
          <label>${t('Name')}</label>
          <input id="cat-name" class="form-control" value="${cat.name}" required>
        </div>
        <div class="form-group">
          <label>${t('Type')}</label>
          <select id="cat-type" class="form-control">
            <option value="expense" ${cat.type === 'expense' ? 'selected' : ''}>${t('Expense')}</option>
            <option value="income" ${cat.type === 'income' ? 'selected' : ''}>${t('Income')}</option>
          </select>
        </div>
        <div class="form-group">
          <label>${t('Icon')}</label>
          <div class="icon-grid" id="icon-grid">
            ${ICONS.map(ic => `
              <button type="button" class="icon-pick ${ic === cat.icon ? 'active' : ''}" data-icon="${ic}">
                <i class="ph ${ic}"></i>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>${t('Colour')}</label>
          <div class="icon-grid" id="color-grid">
            ${COLORS.map(col => `
              <button type="button" class="color-pick ${col === (cat.color || DEFAULT_COLOR) ? 'active' : ''}" data-color="${col}" style="background:${col}"></button>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? t('Save') : t('Create')}</button>
          <button type="button" class="btn btn-outline" id="cat-cancel">${t('Cancel')}</button>
        </div>
      </form>
    </div>
  `;

  let selectedIcon = cat.icon;
  let selectedColor = cat.color || DEFAULT_COLOR;

  area.querySelectorAll('.icon-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.icon-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = btn.dataset.icon;
    });
  });

  area.querySelectorAll('.color-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });
  });

  area.querySelector('#cat-cancel').addEventListener('click', () => {
    area.innerHTML = '';
  });

  area.querySelector('#cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('cat-name').value.trim(),
      type: document.getElementById('cat-type').value,
      icon: selectedIcon,
      color: selectedColor,
      is_default: false,
    };
    try {
      if (editingId) {
        await DB.update('categories', editingId, data);
        showToast(t('Category updated'));
      } else {
        await DB.create('categories', data);
        showToast(t('Category created'));
      }
      await renderCategories(container);
    } catch (err) {
      showToast(t('Error: {msg}', { msg: err.message }));
    }
  });
}
