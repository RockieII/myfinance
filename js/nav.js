// MyFinance — Sidebar navigation (the platform)
// The sidebar IS the app: it lists the user's dashboard PAGES, grouped in one-level FOLDERS,
// each with a chosen icon (shown in the collapsed icon-rail). Data + Settings live in the header.
// This module owns the pages/folders cache + their CRUD + rendering the sidebar.

import * as DB from './db.js';
import { openSheet } from './sheet.js';
import { iconPickerHTML, bindIconPicker } from './icons.js';
import { esc } from './format.js';
import { t } from './i18n.js';

let folders = [];
let pages = [];
let currentId = localStorage.getItem('mf.page') || null;

// Rendering context, kept so folder-toggle can re-render without the caller.
let _el = null, _active = '', _handlers = {};

export async function loadNav() {
  // Guarded independently so a transient/offline/RLS error (or a not-yet-applied migration)
  // can never reject boot and leave a blank authenticated screen.
  try { folders = await DB.getAll('folders', { order: 'position', ascending: true }); } catch (_) { folders = []; }
  try { pages = await DB.getAll('dashboards', { order: 'position', ascending: true }); } catch (_) { pages = []; }
  pages.forEach(p => { if (!Array.isArray(p.layout)) p.layout = []; });
  if (pages.length && (!currentId || !pages.some(p => p.id === currentId))) setCurrent(pages[0].id);
}

export const getPages = () => pages;
export const getFolders = () => folders;
export const getPage = (id) => pages.find(p => p.id === id) || null;
export const getCurrentId = () => currentId;
export function setCurrent(id) { currentId = id; if (id) localStorage.setItem('mf.page', id); else localStorage.removeItem('mf.page'); }

const nextPos = (arr) => (arr.length ? Math.max(...arr.map(x => x.position ?? 0)) + 1 : 0);

export async function createPage(data) {
  const row = await DB.create('dashboards', { position: nextPos(pages), ...data });
  pages.push(row);
  return row;
}
export async function updatePage(id, changes) {
  const p = getPage(id); if (p) Object.assign(p, changes);
  await DB.update('dashboards', id, changes);
}
export async function deletePage(id) {
  await DB.remove('dashboards', id);
  pages = pages.filter(p => p.id !== id);
  if (currentId === id) setCurrent(pages[0]?.id || null);
}
export async function createFolder(data) {
  const row = await DB.create('folders', { position: nextPos(folders), ...data });
  folders.push(row);
  return row;
}
export async function updateFolder(id, changes) {
  const f = folders.find(x => x.id === id); if (f) Object.assign(f, changes);
  await DB.update('folders', id, changes);
}
export async function deleteFolder(id) {
  await DB.remove('folders', id);           // pages.folder_id → NULL via FK
  folders = folders.filter(f => f.id !== id);
  pages.forEach(p => { if (p.folder_id === id) p.folder_id = null; });
}

// --- open/closed folder state ---
function openSet() { try { return new Set(JSON.parse(localStorage.getItem('mf.openFolders') || '[]')); } catch { return new Set(); } }
function toggleFolder(id) {
  const s = openSet();
  s.has(id) ? s.delete(id) : s.add(id);
  localStorage.setItem('mf.openFolders', JSON.stringify([...s]));
}

// --- render ---
export function renderSidebar(el, activeKey, handlers) {
  _el = el; _active = activeKey; _handlers = handlers || {};
  const open = openSet();

  const pageItem = (p) => `
    <button class="nav-item ${activeKey === 'p:' + p.id ? 'active' : ''}" data-page="${p.id}" title="${esc(p.name)}">
      <i class="ph ${esc(p.icon || 'ph-squares-four')}"></i><span class="nav-label">${esc(p.name)}</span>
      <span class="nav-edit" data-page-opts="${p.id}" title="${t('Page options')}">⋯</span>
    </button>`;

  const topPages = pages.filter(p => !p.folder_id);

  el.innerHTML = `
    <div class="nav-scroll">
      ${folders.map(f => {
        const isOpen = open.has(f.id);
        const fpages = pages.filter(p => p.folder_id === f.id);
        return `
          <div class="nav-folder">
            <button class="nav-item nav-folder-head" data-folder="${f.id}" title="${esc(f.name)}">
              <i class="ph ${esc(f.icon || 'ph-folder')}"></i><span class="nav-label">${esc(f.name)}</span>
              <i class="ph ph-caret-${isOpen ? 'down' : 'right'} nav-caret"></i>
              <span class="nav-edit" data-folder-opts="${f.id}" title="${t('Folder options')}">⋯</span>
            </button>
            <div class="nav-folder-pages" ${isOpen ? '' : 'hidden'}>${fpages.map(pageItem).join('')}</div>
          </div>`;
      }).join('')}
      ${topPages.map(pageItem).join('')}
      <div class="nav-new">
        <button class="nav-item" data-action="add-page" title="${t('New page')}"><i class="ph ph-plus"></i><span class="nav-label">${t('Page')}</span></button>
        <button class="nav-item" data-action="add-folder" title="${t('New folder')}"><i class="ph ph-folder-simple-plus"></i><span class="nav-label">${t('Folder')}</span></button>
      </div>
    </div>`;

  el.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', (e) => {
    if (e.target.closest('[data-page-opts]')) return;   // ⋯ handled below
    _handlers.onSelectPage?.(b.dataset.page);
  }));
  el.querySelectorAll('[data-page-opts]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    openPageSheet(getPage(b.dataset.pageOpts));
  }));
  el.querySelectorAll('[data-folder]').forEach(b => b.addEventListener('click', (e) => {
    if (e.target.closest('[data-folder-opts]')) return;   // ⋯ handled below
    toggleFolder(b.dataset.folder);
    renderSidebar(_el, _active, _handlers);
  }));
  el.querySelectorAll('[data-folder-opts]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    openFolderSheet(folders.find(f => f.id === b.dataset.folderOpts));
  }));
  el.querySelector('[data-action="add-page"]').addEventListener('click', () => _handlers.onAddPage?.());
  el.querySelector('[data-action="add-folder"]').addEventListener('click', () => openFolderSheet(null));

  bindStickyFade(el);
}

function rerenderSidebar() { if (_el) renderSidebar(_el, _active, _handlers); }

// The "+ Page / + Folder" block (.nav-new) sticks to the bottom of .nav-scroll; the fade above
// it must only show while the block is actually stuck with items still scrolled behind it —
// pure CSS can't know that, so a scroll handler toggles .stuck. The scroll listener dies with
// the replaced node on re-render; the window resize listener is managed so re-renders (e.g.
// folder toggles) never stack duplicates.
let _onNavResize = null;
function bindStickyFade(el) {
  const sc = el.querySelector('.nav-scroll');
  if (!sc) return;
  const update = () => sc.classList.toggle('stuck',
    sc.scrollHeight > sc.clientHeight && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2);
  sc.addEventListener('scroll', update, { passive: true });
  if (_onNavResize) window.removeEventListener('resize', _onNavResize);
  window.addEventListener('resize', (_onNavResize = update));
  update();
}

// Page options (name / folder / icon / delete) — opened from the page item's ⋯.
// Theme styling lives in the dashboard's personalize panel, page creation in the page gallery.
function openPageSheet(page) {
  if (!page) return;
  const { el, close } = openSheet(`
    <h3>${t('Page options')}</h3>
    <div class="form-group"><label>${t('Name')}</label><input id="pg-name" class="form-control" value="${esc(page.name)}"></div>
    <div class="form-group"><label>${t('Folder')}</label>
      <select id="pg-folder" class="form-control">
        <option value="">${t('— None (top level) —')}</option>
        ${folders.map(f => `<option value="${f.id}" ${f.id === page.folder_id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>${t('Icon')}</label>${iconPickerHTML(page.icon || 'ph-squares-four')}</div>
    <div class="flex gap-8" style="margin-top:8px">
      <button class="btn btn-primary" id="pg-save" style="flex:1">${t('Save')}</button>
      ${pages.length > 1 ? `<button class="btn btn-danger" id="pg-del">${t('Delete')}</button>` : ''}
    </div>`);

  const getIcon = bindIconPicker(el, page.icon || 'ph-squares-four');
  el.querySelector('#pg-save').addEventListener('click', async () => {
    const name = el.querySelector('#pg-name').value.trim() || page.name;
    const folder_id = el.querySelector('#pg-folder').value || null;
    close();
    try { await updatePage(page.id, { name, icon: getIcon(), folder_id }); }
    catch (err) { showToast(t('Save failed') + ': ' + err.message); return; }
    window.rerenderApp?.();
  });
  el.querySelector('#pg-del')?.addEventListener('click', async () => {
    if (!confirm(t('Delete this page?'))) return;
    close();
    try { await deletePage(page.id); }
    catch (err) { showToast(t('Delete failed') + ': ' + err.message); return; }
    window.rerenderApp?.();
  });
}

// Create / edit a folder (name + icon), with delete when editing.
function openFolderSheet(folder) {
  const editing = !!folder;
  const cur = folder || { name: '', icon: 'ph-folder' };
  const { el, close } = openSheet(`
    <h3>${editing ? t('Edit folder') : t('New folder')}</h3>
    <div class="form-group"><label>${t('Name')}</label><input id="fd-name" class="form-control" value="${esc(cur.name)}" placeholder="${t('e.g. Home')}"></div>
    <div class="form-group"><label>${t('Icon')}</label>${iconPickerHTML(cur.icon)}</div>
    <div class="flex gap-8">
      <button class="btn btn-primary" id="fd-save" style="flex:1">${editing ? t('Save') : t('Create')}</button>
      ${editing ? `<button class="btn btn-danger" id="fd-del">${t('Delete')}</button>` : ''}
    </div>`);

  const getIcon = bindIconPicker(el, cur.icon);
  el.querySelector('#fd-save').addEventListener('click', async () => {
    const name = el.querySelector('#fd-name').value.trim() || t('Folder');
    const icon = getIcon();
    close();
    if (editing) await updateFolder(folder.id, { name, icon });
    else await createFolder({ name, icon });
    rerenderSidebar();
  });
  el.querySelector('#fd-del')?.addEventListener('click', async () => {
    if (!confirm(t('Delete this folder? Its pages move to the top level (not deleted).'))) return;
    close();
    await deleteFolder(folder.id);
    rerenderSidebar();
  });
}
