// MyFinance — Dashboards (the platform)
// Renders the sidebar-selected dashboard page as a grid of widgets; Edit mode adds/resizes/removes
// widgets; page options set name/icon/folder/theme, add pages (blank or template), delete.
// Pages/folders live in js/nav.js (the sidebar owns them); this view reads/updates via nav.

import { loadContext, renderGrid, getCols } from '../dashboards/engine.js';
import { WIDGETS } from '../dashboards/registry.js';
import { THEMES, getTheme } from '../dashboards/themes.js';
import { PREBUILT } from '../dashboards/prebuilt.js';
import { openSheet } from '../sheet.js';
import { iconPickerHTML, bindIconPicker } from '../icons.js';
import * as nav from '../nav.js';

let ctx = null;
let editing = false;
let resizeCols = null;
let hostContainer = null;
let resizeBound = false;

// Cache the data context across dashboard page switches (they only differ in layout/theme).
// app.render() calls this when navigating away, so returning after a Data/Settings edit reloads.
window.invalidateDashboards = () => { ctx = null; };

const uid = () => 'w' + Math.random().toString(36).slice(2, 8);
const instantiate = (layout) => layout.map(it => ({ id: uid(), ...it }));

export async function renderDashboards(container) {
  if (!ctx) ctx = await loadContext();

  // Ensure at least one page exists (first-run seeds the Overview template).
  if (!nav.getPages().length) {
    const tpl = PREBUILT[0];
    try {
      const row = await nav.createPage({ name: tpl.name, theme: tpl.theme, icon: 'ph-chart-pie-slice', layout: instantiate(tpl.layout) });
      nav.setCurrent(row.id);
      window.refreshNav?.();
    } catch (_) { /* offline — show empty state */ }
  }

  editing = false;
  hostContainer = container;
  draw(container);

  resizeCols = getCols();
  if (!resizeBound) { window.addEventListener('resize', onResize); resizeBound = true; }
}

function onResize() {
  if ((location.hash.replace('#', '') || 'dashboard') !== 'dashboard' || !hostContainer) return;
  if (getCols() !== resizeCols) { resizeCols = getCols(); draw(hostContainer); }
}

function draw(container) {
  const page = nav.getPage(nav.getCurrentId());
  if (!page) {
    container.innerHTML = '<div class="empty">No dashboard yet. Use “+ Page” in the sidebar to create one.</div>';
    return;
  }
  const theme = getTheme(page.theme);
  ctx.accent = theme.accent;
  ctx.font = theme.font;

  container.innerHTML = `
    <div class="dash-bar">
      <span class="fs-12 text-dim">${editing ? 'Editing — resize –W/+W/–H/+H, ✕ removes' : page.name}</span>
      <div class="flex gap-8">
        ${editing ? '<button id="add-widget" class="btn btn-outline btn-sm">+ Widget</button>' : ''}
        ${editing ? '<button id="page-opts" class="btn btn-outline btn-sm" title="Page options">⋯</button>' : ''}
        <button id="edit-toggle" class="btn ${editing ? 'btn-primary' : 'btn-outline'} btn-sm">${editing ? 'Done' : 'Edit'}</button>
      </div>
    </div>
    <div class="grid-host" id="grid-host" style="font-family:${theme.font || 'inherit'}"></div>
  `;

  renderGrid(container.querySelector('#grid-host'), page.layout, ctx, { editing, onChange: onLayoutChange(container) });

  container.querySelector('#edit-toggle').addEventListener('click', () => { editing = !editing; draw(container); });
  container.querySelector('#add-widget')?.addEventListener('click', () => openLibrary(container));
  container.querySelector('#page-opts')?.addEventListener('click', () => openPageOptions(container));
}

function onLayoutChange(container) {
  return async (newLayout) => {
    const page = nav.getPage(nav.getCurrentId());
    page.layout = newLayout;
    draw(container);
    try { await nav.updatePage(page.id, { layout: newLayout }); }
    catch (err) { showToast('Save failed: ' + err.message); }
  };
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
    const w = WIDGETS[b.dataset.add];
    const page = nav.getPage(nav.getCurrentId());
    const layout = [...page.layout, { id: uid(), type: b.dataset.add, w: w.minW, h: w.minH }];
    page.layout = layout;
    close();
    draw(container);
    try { await nav.updatePage(page.id, { layout }); } catch (err) { showToast('Save failed: ' + err.message); }
  }));
}

function openPageOptions(container) {
  const page = nav.getPage(nav.getCurrentId());
  const folders = nav.getFolders();
  const { el, close } = openSheet(`
    <h3>Page options</h3>
    <div class="form-group"><label>Name</label><input id="pg-name" class="form-control" value="${page.name}"></div>
    <div class="form-group"><label>Folder</label>
      <select id="pg-folder" class="form-control">
        <option value="">— None (top level) —</option>
        ${folders.map(f => `<option value="${f.id}" ${f.id === page.folder_id ? 'selected' : ''}>${f.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Icon</label>${iconPickerHTML(page.icon || 'ph-squares-four')}</div>
    <div class="section-title" style="margin-top:0">Theme</div>
    <div class="theme-grid">
      ${Object.entries(THEMES).map(([id, t]) => `<button class="theme-chip ${id === page.theme ? 'active' : ''}" data-theme="${id}"><span class="theme-dot" style="background:${t.accent}"></span>${t.name}</button>`).join('')}
    </div>
    <div class="section-title">Add a page</div>
    <button class="btn btn-outline mb-12" style="width:100%" data-new="blank">Blank page</button>
    ${PREBUILT.map(t => `<button class="btn btn-outline mb-12" style="width:100%" data-new="${t.id}">${t.name} <span class="text-dim fs-12">· template</span></button>`).join('')}
    <div class="flex gap-8" style="margin-top:8px">
      <button class="btn btn-primary" id="pg-save" style="flex:1">Save</button>
      ${nav.getPages().length > 1 ? '<button class="btn btn-danger" id="pg-del">Delete</button>' : ''}
    </div>
  `);

  const getIcon = bindIconPicker(el, page.icon || 'ph-squares-four');
  let theme = page.theme;
  el.querySelectorAll('.theme-chip').forEach(c => c.addEventListener('click', () => {
    el.querySelectorAll('.theme-chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active'); theme = c.dataset.theme;
  }));

  el.querySelector('#pg-save').addEventListener('click', async () => {
    const name = el.querySelector('#pg-name').value.trim() || page.name;
    const folder_id = el.querySelector('#pg-folder').value || null;
    close();
    try { await nav.updatePage(page.id, { name, icon: getIcon(), theme, folder_id }); } catch (err) { showToast('Save failed: ' + err.message); }
    window.refreshNav?.();
    draw(container);
  });

  el.querySelector('#pg-del')?.addEventListener('click', async () => {
    if (!confirm('Delete this page?')) return;
    close();
    try { await nav.deletePage(page.id); } catch (err) { showToast('Delete failed: ' + err.message); return; }
    window.rerenderApp?.();
  });

  el.querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', async () => {
    const which = b.dataset.new;
    const tpl = which === 'blank' ? null : PREBUILT.find(t => t.id === which);
    close();
    try {
      const row = await nav.createPage({
        name: tpl ? tpl.name : 'New page',
        theme: tpl ? tpl.theme : 'default',
        icon: 'ph-squares-four',
        layout: tpl ? instantiate(tpl.layout) : [],
      });
      nav.setCurrent(row.id);
      window.rerenderApp?.();
    } catch (err) { showToast('Could not add page: ' + err.message); }
  }));
}
