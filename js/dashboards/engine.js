// MyFinance — Dashboard engine (free grid)
// Renders a layout onto a fixed-cell CSS grid (the data context lives in context.js).
// Layout = array of { id, type, x, y, w, h, bp? } in grid cells. Legacy items without x/y are
// placed first-fit row-major (same result CSS auto-placement gave). Base coords belong to the
// board they were authored on; editing on a NARROWER board never rewrites them — those edits
// snapshot into a per-item bp[cols] override ({ x,y,w,h } per column count), so a phone edit
// can't destroy a desktop arrangement. Old clients ignore bp harmlessly.
// Drag/resize interactions live in grid-dnd.js; board CSS in css/grid.css.

import { WIDGETS } from './registry.js';
import { attachGridDnd, cancelActiveDrag } from './grid-dnd.js';
import { t } from '../i18n.js';

// Grid resolution (columns) by width — more cells = finer placement/sizing.
export function getCols() {
  const w = window.innerWidth;
  if (w >= 1100) return 8;
  if (w >= 769) return 6;
  return 4;
}

// Visible rows the board is sized for (content may extend below — the host scrolls).
export function getRows() { return getCols() === 4 ? 7 : 6; }

// ---- Placement helpers (occupancy set keyed "x:y") ----
const key = (x, y) => x + ':' + y;
function fits(occ, x, y, w, h) {
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if (occ.has(key(i, j))) return false;
  return true;
}
function mark(occ, x, y, w, h) {
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) occ.add(key(i, j));
}

// First free rect at or after the cursor, scanning row-major (matches the sparse CSS
// auto-placement the legacy span-only layouts were built against). The board is HARD-bounded
// at `rows` (no scrolling): if the forward scan fails, retry densely from the origin; if the
// board is truly full, fall back to the bottom-right corner (overlap — rare, legacy overfull).
function firstFit(occ, cur, w, h, cols, rows) {
  for (let y = cur.y; y <= rows - h; y++) {
    for (let x = (y === cur.y ? cur.x : 0); x <= cols - w; x++) {
      if (fits(occ, x, y, w, h)) return { x, y };
    }
  }
  for (let y = 0; y <= rows - h; y++) {
    for (let x = 0; x <= cols - w; x++) if (fits(occ, x, y, w, h)) return { x, y };
  }
  return { x: Math.max(0, cols - w), y: Math.max(0, rows - h) };
}

// Normalize a stored layout for `cols` columns: per-item bp[cols] override wins over the base
// geometry; sizes clamp to registry minimums and the board width; legacy items without coords
// are placed first-fit (array order, forward cursor). If any effective rect was made on a
// wider board (x+w > cols), reflow everything for display instead.
export function normalizeLayout(layout, cols, rows = getRows()) { return normalize(layout, cols, rows).items; }

function normalize(layout, cols, rows) {
  const out = [];
  const occ = new Set();
  let cur = { x: 0, y: 0 };
  let overflowed = false;   // authored for a bigger board → edits persist into bp[cols]
  let adjusted = false;     // stored sizes were clamped (e.g. a raised minW/minH) → reflow so
                            // the upgraded widget can't overlap its neighbours
  for (const raw of layout) {
    const def = WIDGETS[raw.type] || { minW: 1, minH: 1 };
    const eff = raw.bp?.[cols] ?? raw;
    const w = Math.min(Math.max(eff.w || def.minW, def.minW), cols);
    const h = Math.min(Math.max(eff.h || def.minH, def.minH), rows);
    let x = eff.x, y = eff.y;
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0) {
      if (x + (eff.w || w) > cols || y + h > rows) overflowed = true; // stored for a bigger board
      if ((eff.w && eff.w !== w) || (eff.h && eff.h !== h)) adjusted = true;
      x = Math.min(x, cols - w);
      y = Math.min(y, rows - h);
    } else {
      ({ x, y } = firstFit(occ, cur, w, h, cols, rows));
      cur = { x, y };
    }
    mark(occ, x, y, w, h);
    out.push({ id: raw.id, type: raw.type, x, y, w, h });
  }
  return { items: (overflowed || adjusted) ? reflowToBoard(out, cols, rows) : out, overflowed };
}

// Deterministic display-only reflow into a smaller board: (y,x) order, first-fit from origin.
function reflowToBoard(items, cols, rows) {
  const sorted = items.map((it, i) => [it, i])
    .sort((a, b) => a[0].y - b[0].y || a[0].x - b[0].x || a[1] - b[1]).map(p => p[0]);
  const occ = new Set();
  return sorted.map(it => {
    const w = Math.min(it.w, cols);
    const h = Math.min(it.h, rows);
    const pos = firstFit(occ, { x: 0, y: 0 }, w, h, cols, rows);
    mark(occ, pos.x, pos.y, w, h);
    return { ...it, x: pos.x, y: pos.y, w, h };
  });
}

// First free spot for a w×h widget on the CURRENT board, or null when the page is full.
// Used by "+ Widget" so adding to a full page refuses instead of overflowing the board.
export function findSpot(layout, w, h) {
  const cols = getCols(), rows = getRows();
  const occ = new Set();
  normalize(layout, cols, rows).items.forEach(it => mark(occ, it.x, it.y, it.w, it.h));
  for (let y = 0; y <= rows - h; y++) {
    for (let x = 0; x <= cols - w; x++) if (fits(occ, x, y, w, h)) return { x, y };
  }
  return null;
}

let charts = [];
let pendingRaf = null;
let hostRO = null;

export function renderGrid(container, layout, ctx, opts = {}) {
  const { editing = false, onChange } = opts;
  cancelActiveDrag();   // a re-render mid-drag would orphan the drag clone/ghost
  if (pendingRaf) { cancelAnimationFrame(pendingRaf); pendingRaf = null; }
  charts.forEach(c => { try { c.destroy(); } catch (_) {} });
  charts = [];
  ctx.addChart = (c) => charts.push(c);

  const cols = getCols();
  const rows = getRows();
  const { items, overflowed } = normalize(layout, cols, rows);

  container.innerHTML = `
    <div class="grid-canvas ${editing ? 'editing' : ''}" style="--cols:${cols}">
      ${items.map(item => {
        const w = WIDGETS[item.type];
        if (!w) return '';
        return `
          <div class="widget" data-id="${item.id}" style="grid-column:${item.x + 1} / span ${item.w};grid-row:${item.y + 1} / span ${item.h}">
            <div class="widget-head"><span class="widget-title">${t(w.title)}</span>${editing ? `<span class="widget-ctrls"><button class="wc wc-rm" data-act="rm" title="${t('Remove')}">✕</button></span>` : ''}</div>
            <div class="widget-body" data-body="${item.id}"></div>
          </div>`;
      }).join('')}
    </div>`;

  // Cell height: the visible board (host height) split into `rows` rows; grid-auto-rows in
  // grid.css consumes --cell-h. Content taller than the board just makes the host scroll.
  const canvas = container.firstElementChild;
  const setCellH = () => {
    const gap = parseFloat(getComputedStyle(canvas).gap) || 10;
    const hostH = container.clientHeight;
    if (hostH > 0) canvas.style.setProperty('--cell-h', ((hostH - (rows - 1) * gap) / rows).toFixed(2) + 'px');
  };
  setCellH();
  hostRO?.disconnect();
  if (window.ResizeObserver) { hostRO = new ResizeObserver(setCellH); hostRO.observe(container); }

  // Render bodies after layout so chart canvases have real dimensions.
  // Snapshot the accent/font for this render so a rapid re-render can't repaint with another page's theme.
  const accent = ctx.accent, font = ctx.font;
  pendingRaf = requestAnimationFrame(() => {
    pendingRaf = null;
    ctx.accent = accent; ctx.font = font;
    items.forEach(item => {
      const w = WIDGETS[item.type];
      const el = container.querySelector(`[data-body="${item.id}"]`);
      if (w && el) { try { w.render(el, ctx); } catch (err) { el.innerHTML = `<div class="empty fs-12">${t('Widget error')}</div>`; } }
    });
  });

  // Edit mode: remove buttons here; drag-to-move / tap-to-select / handle-resize in grid-dnd.
  if (editing && typeof onChange === 'function') {
    // Persistence adapter: on a narrower board than the layout was authored for (display was
    // reflowed, or bp overrides already exist here), edits snapshot into bp[cols] and the base
    // coords stay untouched; on the layout's own board, edits write the base coords directly.
    const narrow = overflowed || layout.some(it => it.bp && it.bp[cols]);
    const rawById = new Map(layout.map(r => [r.id, r]));
    const save = (display) => onChange(display.map(d => {
      const raw = rawById.get(d.id);
      if (!raw) return { id: d.id, type: d.type, x: d.x, y: d.y, w: d.w, h: d.h };
      if (narrow) return { ...raw, bp: { ...raw.bp, [cols]: { x: d.x, y: d.y, w: d.w, h: d.h } } };
      const { bp, ...base } = raw;
      const stored = { ...base, x: d.x, y: d.y, w: d.w, h: d.h };
      if (bp) stored.bp = bp;
      return stored;
    }));
    canvas.querySelectorAll('[data-act="rm"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.widget').dataset.id;
        save(items.filter(x => x.id !== id));
      });
    });
    attachGridDnd(canvas, items, { cols, rows, onChange: save });
  }
}
