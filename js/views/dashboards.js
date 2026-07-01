// MyFinance — Dashboards (Platform v2, grid canvas)
// Renders a dashboard page and lets you edit it: add widgets from the library, resize them
// (span more/fewer grid cells — the visual adapts), and remove them. Layout persists to the
// `dashboards` table. Page themes + multiple pages + prebuilt gallery come in Phase 5.

import * as DB from '../db.js';
import { loadContext, renderGrid, getCols, DEFAULT_LAYOUT } from '../dashboards/engine.js';
import { WIDGETS } from '../dashboards/registry.js';
import { openSheet } from '../sheet.js';

let ctx = null;
let dashboardId = null;
let layout = [];
let editing = false;
let resizeCols = null;

export async function renderDashboards(container) {
  ctx = await loadContext();

  // Load the user's first page, or create a default one.
  let pages = [];
  try { pages = await DB.getAll('dashboards', { order: 'position', ascending: true }); } catch (_) {}
  if (pages.length) {
    dashboardId = pages[0].id;
    layout = Array.isArray(pages[0].layout) && pages[0].layout.length ? pages[0].layout : DEFAULT_LAYOUT.slice();
  } else {
    try {
      const row = await DB.create('dashboards', { name: 'My dashboard', theme: 'default', layout: DEFAULT_LAYOUT, position: 0 });
      dashboardId = row.id;
      layout = Array.isArray(row.layout) ? row.layout : DEFAULT_LAYOUT.slice();
    } catch (_) { dashboardId = null; layout = DEFAULT_LAYOUT.slice(); }
  }
  editing = false;
  draw(container);

  resizeCols = getCols();
  window.onresize = () => {
    const tab = location.hash.replace('#', '') || 'dashboard';
    if (tab !== 'dashboard') return;
    if (getCols() !== resizeCols) { resizeCols = getCols(); draw(container); }
  };
}

function draw(container) {
  container.innerHTML = `
    <div class="dash-bar">
      <span class="fs-12 text-dim">${editing ? 'Editing — resize with –W/+W/–H/+H, ✕ removes' : 'Dashboard'}</span>
      <div class="flex gap-8">
        ${editing ? '<button id="add-widget" class="btn btn-outline btn-sm">+ Widget</button>' : ''}
        <button id="edit-toggle" class="btn ${editing ? 'btn-primary' : 'btn-outline'} btn-sm">${editing ? 'Done' : 'Edit'}</button>
      </div>
    </div>
    <div class="grid-host" id="grid-host"></div>
  `;

  renderGrid(container.querySelector('#grid-host'), layout, ctx, { editing, onChange: onLayoutChange(container) });

  container.querySelector('#edit-toggle').addEventListener('click', () => { editing = !editing; draw(container); });
  const addBtn = container.querySelector('#add-widget');
  if (addBtn) addBtn.addEventListener('click', () => openLibrary(container));
}

function onLayoutChange(container) {
  return async (newLayout) => {
    layout = newLayout;
    draw(container);        // re-render immediately (stays in edit mode)
    await saveLayout();
  };
}

async function saveLayout() {
  if (!dashboardId) return;
  try { await DB.update('dashboards', dashboardId, { layout }); }
  catch (err) { showToast('Save failed: ' + err.message); }
}

function openLibrary(container) {
  const hasProfiles = (ctx.profiles || []).length >= 2;
  const entries = Object.entries(WIDGETS);
  const btns = (section) => entries.filter(([, w]) => w.section === section)
    .map(([type, w]) => `<button class="btn btn-outline mb-12" style="width:100%" data-add="${type}">${w.title}</button>`).join('');

  const { el, close } = openSheet(`
    <h3>Add a widget</h3>
    <div class="section-title" style="margin-top:0">Solo</div>
    ${btns('solo')}
    <div class="section-title">Multiple ${hasProfiles ? '' : '<span class="text-dim" style="text-transform:none;letter-spacing:0">· needs 2+ profiles</span>'}</div>
    ${hasProfiles ? btns('multiple') : '<div class="fs-12 text-dim mb-12">Add profiles in Settings to unlock per-person widgets.</div>'}
    <button class="btn btn-outline" id="lib-close" style="width:100%">Close</button>
  `);
  el.querySelector('#lib-close').addEventListener('click', close);
  el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', async () => {
    const type = b.dataset.add;
    const w = WIDGETS[type];
    layout = [...layout, { id: 'w' + Date.now().toString(36), type, w: w.minW, h: w.minH }];
    close();
    draw(container);
    await saveLayout();
  }));
}
