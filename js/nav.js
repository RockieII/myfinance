// MyFinance — Sidebar navigation (the platform)
// The sidebar IS the app: it lists the user's dashboard PAGES, grouped in one-level FOLDERS,
// each with a chosen icon (shown in the collapsed icon-rail). Data + Settings live in the header.
// This module owns the pages/folders cache + their CRUD + rendering the sidebar.

import * as DB from './db.js';
import { openSheet } from './sheet.js';
import { iconPickerHTML, bindIconPicker } from './icons.js';

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
    <button class="nav-item ${activeKey === 'p:' + p.id ? 'active' : ''}" data-page="${p.id}" title="${p.name}">
      <i class="ph ${p.icon || 'ph-squares-four'}"></i><span class="nav-label">${p.name}</span>
    </button>`;

  const topPages = pages.filter(p => !p.folder_id);

  el.innerHTML = `
    <div class="nav-scroll">
      ${folders.map(f => {
        const isOpen = open.has(f.id);
        const fpages = pages.filter(p => p.folder_id === f.id);
        return `
          <div class="nav-folder">
            <button class="nav-item nav-folder-head" data-folder="${f.id}" title="${f.name}">
              <i class="ph ${f.icon || 'ph-folder'}"></i><span class="nav-label">${f.name}</span>
              <i class="ph ph-caret-${isOpen ? 'down' : 'right'} nav-caret"></i>
              <span class="nav-edit" data-folder-opts="${f.id}" title="Folder options">⋯</span>
            </button>
            <div class="nav-folder-pages" ${isOpen ? '' : 'hidden'}>${fpages.map(pageItem).join('')}</div>
          </div>`;
      }).join('')}
      ${topPages.map(pageItem).join('')}
    </div>
    <div class="nav-actions">
      <button class="nav-item" data-action="add-page"><i class="ph ph-plus"></i><span class="nav-label">Page</span></button>
      <button class="nav-item" data-action="add-folder"><i class="ph ph-folder-simple-plus"></i><span class="nav-label">Folder</span></button>
    </div>`;

  el.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => _handlers.onSelectPage?.(b.dataset.page)));
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
}

function rerenderSidebar() { if (_el) renderSidebar(_el, _active, _handlers); }

// Create / edit a folder (name + icon), with delete when editing.
function openFolderSheet(folder) {
  const editing = !!folder;
  const cur = folder || { name: '', icon: 'ph-folder' };
  const { el, close } = openSheet(`
    <h3>${editing ? 'Edit' : 'New'} folder</h3>
    <div class="form-group"><label>Name</label><input id="fd-name" class="form-control" value="${cur.name}" placeholder="e.g. Home"></div>
    <div class="form-group"><label>Icon</label>${iconPickerHTML(cur.icon)}</div>
    <div class="flex gap-8">
      <button class="btn btn-primary" id="fd-save" style="flex:1">${editing ? 'Save' : 'Create'}</button>
      ${editing ? '<button class="btn btn-danger" id="fd-del">Delete</button>' : ''}
    </div>`);

  const getIcon = bindIconPicker(el, cur.icon);
  el.querySelector('#fd-save').addEventListener('click', async () => {
    const name = el.querySelector('#fd-name').value.trim() || 'Folder';
    const icon = getIcon();
    close();
    if (editing) await updateFolder(folder.id, { name, icon });
    else await createFolder({ name, icon });
    rerenderSidebar();
  });
  el.querySelector('#fd-del')?.addEventListener('click', async () => {
    if (!confirm('Delete this folder? Its pages move to the top level (not deleted).')) return;
    close();
    await deleteFolder(folder.id);
    rerenderSidebar();
  });
}
