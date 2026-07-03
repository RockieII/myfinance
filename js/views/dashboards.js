// MyFinance — Dashboards (the platform)
// Renders the sidebar-selected dashboard page as a grid of widgets. Edit mode: arrange/resize
// widgets (engine + grid-dnd), add from the widget library, style the page (personalize panel).
// Page CRUD sheets live with the sidebar (js/nav.js); page creation goes through the page gallery.

import { renderGrid, getCols, findSpot } from '../dashboards/engine.js';
import { loadContext } from '../dashboards/context.js';
import { resolveTheme } from '../dashboards/themes.js';
import { WIDGETS } from '../dashboards/registry.js';
import { openLibrary } from '../dashboards/library.js';
import { openPersonalize, applyPageTheme, syncPersonalize } from '../dashboards/personalize.js';
import { esc } from '../format.js';
import { t } from '../i18n.js';
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

export async function renderDashboards(container) {
  if (!ctx) ctx = await loadContext();

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
  syncPersonalize(page?.id);   // page switched (no hash change) → unbind the style panel
  if (!page) {
    // All pages deleted — a deliberate state, not an error. Centered, calm.
    container.innerHTML = `
      <div class="dash-empty">
        <i class="ph ph-ghost"></i>
        <div class="dash-empty-title">${t('Nothing to see here')}</div>
        <div class="fs-12">${t('Create a page with “+ Page” in the sidebar.')}</div>
      </div>`;
    return;
  }
  const theme = resolveTheme(page.theme);
  ctx.accent = theme.accent;
  ctx.font = theme.font || '';

  container.innerHTML = `
    <div class="dash-bar">
      <span class="fs-12 text-dim">${editing ? t('Editing — drag to move, use the handles to resize') : esc(page.name)}</span>
      <div class="flex gap-8">
        ${editing ? `<button id="add-widget" class="btn btn-outline btn-sm">+ ${t('Widget')}</button>` : ''}
        ${editing ? `<button id="style-page" class="btn btn-outline btn-sm" title="${t('Page style')}"><i class="ph ph-palette"></i></button>` : ''}
        <button id="edit-toggle" class="btn ${editing ? 'btn-primary' : 'btn-outline'} btn-sm">${editing ? t('Done') : t('Edit')}</button>
      </div>
    </div>
    <div class="grid-host" id="grid-host"></div>
  `;

  const host = container.querySelector('#grid-host');
  applyPageTheme(host, theme);
  renderGrid(host, page.layout, ctx, { editing, onChange: onLayoutChange(container) });

  container.querySelector('#edit-toggle').addEventListener('click', () => { editing = !editing; draw(container); });
  container.querySelector('#add-widget')?.addEventListener('click', () =>
    openLibrary({ ctx, onAdd: (type) => addWidget(container, type) }));
  container.querySelector('#style-page')?.addEventListener('click', () =>
    openPersonalize({
      page,
      onChange: async (themeField) => {
        page.theme = themeField;
        draw(container);
        try { await nav.updatePage(page.id, { theme: themeField }); }
        catch (err) { showToast(t('Save failed') + ': ' + err.message); }
      },
    }));
}

function onLayoutChange(container) {
  return async (newLayout) => {
    const page = nav.getPage(nav.getCurrentId());
    page.layout = newLayout;
    draw(container);
    try { await nav.updatePage(page.id, { layout: newLayout }); }
    catch (err) { showToast(t('Save failed') + ': ' + err.message); }
  };
}

async function addWidget(container, type) {
  const w = WIDGETS[type];
  if (!w) return;
  const page = nav.getPage(nav.getCurrentId());
  // The board has a hard bottom — refuse instead of overflowing when the page is full.
  if (!findSpot(page.layout, w.minW, w.minH)) {
    showToast(t('No space left on this page — resize or remove a widget first.'));
    return;
  }
  const layout = [...page.layout, { id: uid(), type, w: w.minW, h: w.minH }];
  page.layout = layout;
  draw(container);
  try { await nav.updatePage(page.id, { layout }); }
  catch (err) { showToast(t('Save failed') + ': ' + err.message); }
}
