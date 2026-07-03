// MyFinance — Widget library
// The "add a widget" picker: a wide sheet with a two-row horizontal carousel of LIVE widget
// previews (real widgets rendered against DEMO_CTX, scaled down), a tag filter chip row, and
// an info drill-in per widget. Calls onAdd(type) when the user picks a widget.
// Chart lifecycle: every preview chart lands in a local `charts` array; destroyCharts() runs
// before each re-render (filter change / drill-in / back) and on sheet close. All close paths
// (Close button, backdrop click, Escape) funnel through openSheet's close(), which fires
// opts.onClose exactly once — so no observers are needed.

import { WIDGETS } from './registry.js';
import { DEMO_CTX } from './demo-ctx.js';
import { openSheet } from '../sheet.js';
import { t } from '../i18n.js';

// Frozen tag taxonomy order (visual first, then domain) — chips follow this order.
const TAG_ORDER = ['chart', 'line', 'bars', 'pie', 'card', 'list', 'gauge', 'heatmap',
  'net worth', 'spending', 'earnings', 'subscriptions', 'accounts', 'stocks', 'budget', 'people', 'transactions'];

export function openLibrary({ ctx, onAdd }) {
  const hasProfiles = (ctx.profiles || []).length >= 2;
  let filter = 'all';
  let charts = [];
  const destroyCharts = () => { charts.forEach(c => { try { c.destroy(); } catch (_) {} }); charts = []; };

  const { el, close } = openSheet(`<div id="lib-root"></div>`, { wide: true, onClose: destroyCharts });
  const root = el.querySelector('#lib-root');

  const isLocked = (w) => w.section === 'multiple' && !hasProfiles;
  const pick = (type) => { close(); onAdd(type); };

  // Render one real widget into `box` at half scale, with animations off for the snapshot.
  function renderPreview(box) {
    const w = WIDGETS[box.dataset.prev];
    const inner = document.createElement('div');
    inner.className = 'lib-prev-inner';
    box.appendChild(inner);
    const pctx = { ...DEMO_CTX, addChart: (c) => charts.push(c) };
    const prevAnim = Chart.defaults.animation;
    Chart.defaults.animation = false;             // previews are static snapshots
    try { w.render(inner, pctx); }
    catch (_) { inner.innerHTML = `<div class="empty fs-12">${t('Preview unavailable')}</div>`; }
    Chart.defaults.animation = prevAnim;
  }

  function headHTML(backBtn, title) {
    return `<div class="lib-head">
      ${backBtn ? `<button class="btn-icon" data-back title="${t('Back')}"><i class="ph ph-arrow-left"></i></button>` : ''}
      <h3 class="lib-title">${title}</h3>
      <button class="btn-icon" data-close title="${t('Close')}"><i class="ph ph-x"></i></button>
    </div>`;
  }

  function cardHTML(type, w) {
    const locked = isLocked(w);
    return `<div class="lib-card">
      <div class="lib-prev" data-prev="${type}" data-open-info="${type}" title="${t('More info')}"></div>
      <div class="lib-card-row">
        <span class="lib-card-title">${t(w.title)}</span>
        <button class="lib-info" data-info="${type}" title="${t('More info')}"><i class="ph ph-info"></i></button>
      </div>
      ${locked ? `<div class="fs-12 text-dim lib-note">${t('Needs 2+ profiles — add them in Settings.')}</div>` : ''}
      <button class="btn btn-primary btn-sm lib-add" data-add="${type}" ${locked ? 'disabled' : ''}>${t('Add')}</button>
    </div>`;
  }

  function drawGrid() {
    destroyCharts();
    const tags = TAG_ORDER.filter(tag => Object.values(WIDGETS).some(w => (w.tags || []).includes(tag)));
    const entries = Object.entries(WIDGETS).filter(([, w]) => filter === 'all' || (w.tags || []).includes(filter));

    root.innerHTML = `
      ${headHTML(false, t('Widget library'))}
      <div class="lib-chips">
        <button class="lib-chip ${filter === 'all' ? 'active' : ''}" data-tag="all">${t('All')}</button>
        ${tags.map(tag => `<button class="lib-chip ${filter === tag ? 'active' : ''}" data-tag="${tag}">${t(tag)}</button>`).join('')}
      </div>
      ${entries.length
        ? `<div class="lib-carousel">${entries.map(([type, w]) => cardHTML(type, w)).join('')}</div>`
        : `<div class="empty">${t('No widgets match this filter.')}</div>`}`;

    root.querySelectorAll('[data-prev]').forEach(renderPreview);
    root.querySelector('[data-close]').addEventListener('click', close);
    root.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.tag; drawGrid(); }));
    root.querySelectorAll('[data-info]').forEach(b => b.addEventListener('click', () => drawDetail(b.dataset.info)));
    root.querySelectorAll('[data-open-info]').forEach(b => b.addEventListener('click', () => drawDetail(b.dataset.openInfo)));
    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => pick(b.dataset.add)));
  }

  function drawDetail(type) {
    destroyCharts();
    const w = WIDGETS[type];
    if (!w) return drawGrid();
    const locked = isLocked(w);

    root.innerHTML = `
      ${headHTML(true, t(w.title))}
      <div class="lib-detail">
        <div class="lib-prev lib-prev-lg" data-prev="${type}"></div>
        <div class="lib-detail-info">
          <p class="lib-desc">${t(w.desc || '')}</p>
          <div class="lib-tags">${(w.tags || []).map(tag => `<span class="lib-chip lib-chip-sm">${t(tag)}</span>`).join('')}</div>
          <div class="fs-12 text-dim">${t('Minimum size')}: ${w.minW}×${w.minH} · ${t(w.section === 'multiple' ? 'Per-person widget' : 'Solo widget')}</div>
          ${locked ? `<div class="fs-12 text-dim lib-note">${t('This widget compares people, so it needs at least 2 profiles — add them in Settings.')}</div>` : ''}
          <button class="btn btn-primary" data-add="${type}" ${locked ? 'disabled' : ''} style="margin-top:auto">${t('Add to page')}</button>
        </div>
      </div>`;

    root.querySelectorAll('[data-prev]').forEach(renderPreview);
    root.querySelector('[data-close]').addEventListener('click', close);
    root.querySelector('[data-back]').addEventListener('click', drawGrid);
    root.querySelector('[data-add]').addEventListener('click', () => pick(type));
  }

  drawGrid();
}
