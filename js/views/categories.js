// MyFinance — Categories View
// Manage income and expense categories (pre-built + custom).

import * as DB from '../db.js';

const ICONS = [
  'ph-house', 'ph-fork-knife', 'ph-car', 'ph-film-strip', 'ph-heart',
  'ph-graduation-cap', 'ph-repeat', 'ph-shopping-bag', 'ph-lightning',
  'ph-wallet', 'ph-laptop', 'ph-chart-line-up', 'ph-gift', 'ph-tag',
  'ph-airplane', 'ph-paw-print', 'ph-baby', 'ph-barbell', 'ph-bank',
  'ph-briefcase', 'ph-coffee', 'ph-game-controller', 'ph-music-note',
  'ph-paint-brush', 'ph-phone', 'ph-pizza', 'ph-shield-check', 'ph-wrench',
  'ph-dots-three',
];

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
    <div class="flex-between mb-12">
      <div class="tab-toggle">
        <button class="toggle-btn ${filterType === 'expense' ? 'active' : ''}" data-type="expense">Expenses</button>
        <button class="toggle-btn ${filterType === 'income' ? 'active' : ''}" data-type="income">Income</button>
      </div>
      <button class="btn btn-primary btn-sm" id="add-cat-btn">+ Add</button>
    </div>

    <div id="cat-form-area"></div>

    ${defaults.length ? `
      <h3 class="section-title">Default</h3>
      <div class="card">
        ${defaults.map(c => catRow(c, false)).join('')}
      </div>
    ` : ''}

    ${customs.length ? `
      <h3 class="section-title">Custom</h3>
      <div class="card">
        ${customs.map(c => catRow(c, true)).join('')}
      </div>
    ` : ''}

    ${!defaults.length && !customs.length ? '<div class="empty">No categories yet.</div>' : ''}
  `;

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
      if (!confirm('Delete this category? Transactions using it will need reassignment.')) return;
      try {
        await DB.remove('categories', btn.dataset.delete);
        showToast('Category deleted');
        await renderCategories(container);
      } catch (err) {
        showToast('Cannot delete: ' + err.message);
      }
    });
  });
}

function catRow(cat, editable) {
  return `
    <div class="row">
      <i class="ph ${cat.icon}" style="font-size:20px;color:var(--accent);width:24px;text-align:center"></i>
      <span style="flex:1">${cat.name}</span>
      ${editable ? `
        <button data-edit="${cat.id}" class="btn-icon" title="Edit"><i class="ph ph-pencil-simple"></i></button>
        <button data-delete="${cat.id}" class="btn-icon" title="Delete"><i class="ph ph-trash"></i></button>
      ` : ''}
    </div>
  `;
}

function showForm(container, cat) {
  const area = container.querySelector('#cat-form-area');
  area.innerHTML = `
    <div class="card mb-12">
      <h3 style="margin:0 0 12px;font-size:15px">${editingId ? 'Edit' : 'New'} Category</h3>
      <form id="cat-form">
        <div class="form-group">
          <label>Name</label>
          <input id="cat-name" class="form-control" value="${cat.name}" required>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="cat-type" class="form-control">
            <option value="expense" ${cat.type === 'expense' ? 'selected' : ''}>Expense</option>
            <option value="income" ${cat.type === 'income' ? 'selected' : ''}>Income</option>
          </select>
        </div>
        <div class="form-group">
          <label>Icon</label>
          <div class="icon-grid" id="icon-grid">
            ${ICONS.map(ic => `
              <button type="button" class="icon-pick ${ic === cat.icon ? 'active' : ''}" data-icon="${ic}">
                <i class="ph ${ic}"></i>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">${editingId ? 'Save' : 'Create'}</button>
          <button type="button" class="btn btn-outline" id="cat-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;

  let selectedIcon = cat.icon;

  area.querySelectorAll('.icon-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      area.querySelectorAll('.icon-pick').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = btn.dataset.icon;
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
      is_default: false,
    };
    try {
      if (editingId) {
        await DB.update('categories', editingId, data);
        showToast('Category updated');
      } else {
        await DB.create('categories', data);
        showToast('Category created');
      }
      await renderCategories(container);
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  });
}
