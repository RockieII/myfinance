// MyFinance — Dashboards (Platform v2)
// Multiple grid pages the user composes: add/resize/remove widgets, switch/create/rename/delete
// pages, and pick a page theme (colour + font). Everything persists to the `dashboards` table.

import * as DB from '../db.js';
import { loadContext, renderGrid, getCols } from '../dashboards/engine.js';
import { WIDGETS } from '../dashboards/registry.js';
import { THEMES, getTheme } from '../dashboards/themes.js';
import { PREBUILT } from '../dashboards/prebuilt.js';
import { openSheet } from '../sheet.js';

let ctx = null;
let pages = [];
let idx = 0;
let editing = false;
let resizeCols = null;
let hostContainer = null;
let resizeBound = false;

const uid = () => 'w' + Math.random().toString(36).slice(2, 8);
const instantiate = (layout) => layout.map(it => ({ id: uid(), ...it }));
const current = () => pages[idx];

export async function renderDashboards(container) {
  ctx = await loadContext();

  try { pages = await DB.getAll('dashboards', { order: 'position', ascending: true }); } catch (_) { pages = []; }
  pages.forEach(p => { if (!Array.isArray(p.layout)) p.layout = []; });

  if (!pages.length) {
    const tpl = PREBUILT[0];
    try {
      const row = await DB.create('dashboards', { name: tpl.name, theme: tpl.theme, layout: instantiate(tpl.layout), position: 0 });
      pages = [row];
    } catch (_) {
      pages = [{ id: null, name: PREBUILT[0].name, theme: PREBUILT[0].theme, layout: instantiate(PREBUILT[0].layout) }];
    }
  }
  idx = 0;
  editing = false;
  hostContainer = container;
  draw(container);

  // Single managed resize listener (re-render only when the column breakpoint changes on the dashboard tab).
  resizeCols = getCols();
  if (!resizeBound) { window.addEventListener('resize', onResize); resizeBound = true; }
}

function onResize() {
  if ((location.hash.replace('#', '') || 'dashboard') !== 'dashboard' || !hostContainer) return;
  if (getCols() !== resizeCols) { resizeCols = getCols(); draw(hostContainer); }
}

function draw(container) {
  const page = current();
  const theme = getTheme(page.theme);
  ctx.accent = theme.accent;
  ctx.font = theme.font;

  container.innerHTML = `
    <div class="dash-bar">
      <select id="page-sel" class="page-sel" aria-label="Dashboard page">
        ${pages.map((p, i) => `<option value="${i}" ${i === idx ? 'selected' : ''}>${p.name}</option>`).join('')}
      </select>
      <div class="flex gap-8">
        ${editing ? '<button id="add-widget" class="btn btn-outline btn-sm">+ Widget</button>' : ''}
        ${editing ? '<button id="page-opts" class="btn btn-outline btn-sm" title="Page options">⋯</button>' : ''}
        <button id="edit-toggle" class="btn ${editing ? 'btn-primary' : 'btn-outline'} btn-sm">${editing ? 'Done' : 'Edit'}</button>
      </div>
    </div>
    <div class="grid-host" id="grid-host" style="font-family:${theme.font || 'inherit'}"></div>
  `;

  renderGrid(container.querySelector('#grid-host'), page.layout, ctx, { editing, onChange: onLayoutChange(container) });

  container.querySelector('#page-sel').addEventListener('change', (e) => { idx = parseInt(e.target.value); draw(container); });
  container.querySelector('#edit-toggle').addEventListener('click', () => { editing = !editing; draw(container); });
  container.querySelector('#add-widget')?.addEventListener('click', () => openLibrary(container));
  container.querySelector('#page-opts')?.addEventListener('click', () => openPageOptions(container));
}

function onLayoutChange(container) {
  return async (newLayout) => {
    current().layout = newLayout;
    draw(container);
    await savePage();
  };
}

async function savePage() {
  const p = current();
  if (!p.id) return;
  try { await DB.update('dashboards', p.id, { name: p.name, theme: p.theme, layout: p.layout }); }
  catch (err) { showToast('Save failed: ' + err.message); }
}

function openLibrary(container) {
  const hasProfiles = (ctx.profiles || []).length >= 2;
  const btns = (section) => Object.entries(WIDGETS).filter(([, w]) => w.section === section)
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
    current().layout = [...current().layout, { id: uid(), type, w: w.minW, h: w.minH }];
    close();
    draw(container);
    await savePage();
  }));
}

function openPageOptions(container) {
  const p = current();
  const { el, close } = openSheet(`
    <h3>Page options</h3>

    <div class="form-group">
      <label>Name</label>
      <input id="pg-name" class="form-control" value="${p.name}">
    </div>

    <div class="section-title" style="margin-top:0">Theme</div>
    <div class="theme-grid">
      ${Object.entries(THEMES).map(([id, t]) => `
        <button class="theme-chip ${id === p.theme ? 'active' : ''}" data-theme="${id}" title="${t.name}">
          <span class="theme-dot" style="background:${t.accent}"></span>${t.name}
        </button>`).join('')}
    </div>

    <div class="section-title">Add a page</div>
    <button class="btn btn-outline mb-12" style="width:100%" data-new="blank">Blank page</button>
    ${PREBUILT.map(t => `<button class="btn btn-outline mb-12" style="width:100%" data-new="${t.id}">${t.name} <span class="text-dim fs-12">· template</span></button>`).join('')}

    <div class="flex gap-8" style="margin-top:8px">
      <button class="btn btn-primary" id="pg-save" style="flex:1">Save</button>
      ${pages.length > 1 ? '<button class="btn btn-danger" id="pg-del">Delete page</button>' : ''}
    </div>
  `);

  // Theme selection (applies live on save).
  let chosenTheme = p.theme;
  el.querySelectorAll('.theme-chip').forEach(chip => chip.addEventListener('click', () => {
    el.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    chosenTheme = chip.dataset.theme;
  }));

  el.querySelector('#pg-save').addEventListener('click', async () => {
    p.name = el.querySelector('#pg-name').value.trim() || p.name;
    p.theme = chosenTheme;
    close();
    draw(container);
    await savePage();
  });

  el.querySelector('#pg-del')?.addEventListener('click', async () => {
    if (!confirm('Delete this page?')) return;
    close();
    await deletePage(container);
  });

  el.querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', async () => {
    const which = b.dataset.new;
    close();
    await addPage(container, which);
  }));
}

async function addPage(container, which) {
  const tpl = which === 'blank' ? null : PREBUILT.find(t => t.id === which);
  const data = {
    name: tpl ? tpl.name : 'New page',
    theme: tpl ? tpl.theme : 'default',
    layout: tpl ? instantiate(tpl.layout) : [],
    // Unique position (pages.length collides after a delete) → stable ordering across reloads.
    position: pages.length ? Math.max(...pages.map(p => p.position ?? 0)) + 1 : 0,
  };
  try {
    const row = await DB.create('dashboards', data);
    pages.push(row);
    idx = pages.length - 1;
    editing = true;
    draw(container);
  } catch (err) { showToast('Could not add page: ' + err.message); }
}

async function deletePage(container) {
  const p = current();
  try {
    if (p.id) await DB.remove('dashboards', p.id);
    pages.splice(idx, 1);
    idx = Math.max(0, idx - 1);
    draw(container);
  } catch (err) { showToast('Could not delete: ' + err.message); }
}
