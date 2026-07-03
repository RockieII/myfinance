// MyFinance — Free-grid interactions (edit mode only): phone-home-screen behavior.
// Drag anywhere on a widget (6px threshold) to move it — a fixed clone follows the pointer,
// the origin cell shows a dashed placeholder and a ghost marks the projected target cells.
// Hovering an occupied spot for 500ms preview-pushes the overlapped widgets down with a FLIP
// animation, like phone apps (localStorage 'mf.dragReflow' = "0" turns the dwell preview off;
// the push-resolve on drop always runs). Tap selects a widget → 4 edge handles resize it in
// whole-cell steps. Commits call onChange(newLayout) exactly once. No auto-compaction: a free
// grid keeps user-made holes. Escape or dropping outside the board cancels.

import { WIDGETS } from './registry.js';
import { t } from '../i18n.js';

const THRESHOLD = 6;   // px of movement before a press becomes a drag
const HOLD_MS = 280;   // touch: hold time before a press arms a drag (a plain swipe scrolls)
const DWELL_MS = 500;  // hover time over an occupied spot before the push preview
const FLIP_MS = 180;
const EDGE_PX = 36;    // distance from the board edge that triggers auto-scroll while dragging
const EDGE_STEP = 14;  // auto-scroll px per tick

// The in-flight drag/resize (its cancel fn). renderGrid cancels it before replacing the
// canvas — a re-render mid-gesture would otherwise orphan the fixed clone / ghost on screen.
let active = null;
export function cancelActiveDrag() {
  const c = active;
  active = null;
  if (c) { try { c(); } catch (_) { /* already torn down */ } }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Push-down resolve: the `fixedId` item stays put; every widget intersecting it (or one
// already pushed) moves down to the first y where it clears (at minimum below the blocker).
// Processed in (y,x) order; y only ever grows → deterministic, always terminates.
export function pushDown(items, fixedId) {
  const out = items.map(it => ({ ...it }));
  const fixed = out.find(it => it.id === fixedId);
  const placed = fixed ? [fixed] : [];
  const rest = out.filter(it => it !== fixed).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of rest) {
    for (let hit = true; hit;) {
      hit = false;
      for (const p of placed) if (overlap(it, p)) { it.y = p.y + p.h; hit = true; }
    }
    placed.push(it);
  }
  return out;
}

// FLIP: record rects, mutate layout, invert with transforms, transition to identity.
function flip(els, mutate) {
  const before = els.map(el => [el, el.getBoundingClientRect()]);
  mutate();
  for (const [el, f] of before) {
    const l = el.getBoundingClientRect();
    const dx = f.left - l.left, dy = f.top - l.top;
    if (!dx && !dy) continue;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px,${dy}px)`;
    void el.offsetWidth; // force reflow so the transition starts from the inverted position
    el.style.transition = `transform ${FLIP_MS}ms ease`;
    el.style.transform = '';
    el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
  }
}

const applyPos = (el, it) => {
  el.style.gridColumn = `${it.x + 1} / span ${it.w}`;
  el.style.gridRow = `${it.y + 1} / span ${it.h}`;
};

export function attachGridDnd(canvas, items, { cols, rows, onChange }) {
  let selected = null; // currently selected widget element (shows resize handles)
  const byId = (id) => items.find(x => x.id === id);

  const metrics = () => {
    const r = canvas.getBoundingClientRect();
    const cs = getComputedStyle(canvas);
    const gap = parseFloat(cs.gap) || 10;
    return { r, gap, cellW: (r.width - (cols - 1) * gap) / cols, cellH: parseFloat(cs.getPropertyValue('--cell-h')) || 90 };
  };
  const cellPx = (m, g) => ({
    left: g.x * (m.cellW + m.gap), top: g.y * (m.cellH + m.gap),
    width: g.w * m.cellW + (g.w - 1) * m.gap, height: g.h * m.cellH + (g.h - 1) * m.gap,
  });
  const placeGhost = (ghost, g) => {
    const p = cellPx(metrics(), g);
    ghost.style.left = p.left + 'px'; ghost.style.top = p.top + 'px';
    ghost.style.width = p.width + 'px'; ghost.style.height = p.height + 'px';
  };

  // Tap on empty board space deselects.
  canvas.addEventListener('pointerdown', (e) => { if (!e.target.closest('.widget')) deselect(); });

  canvas.querySelectorAll('.widget').forEach(el => {
    el.addEventListener('pointerdown', (e) => onWidgetDown(e, el));
  });

  function onWidgetDown(e, el) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.wc, .gh')) return; // remove button / resize handles handle themselves
    const item = byId(el.dataset.id);
    if (!item) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const host = canvas.parentElement;
    let drag = null;
    let scrolling = false;   // this touch gesture is a board scroll, not a drag
    let lastY = sy;
    // Touch needs a short hold before a press arms a drag — widgets have touch-action:none in
    // edit mode, so a plain swipe can't scroll natively; we pan the host manually instead.
    let holdReady = e.pointerType === 'mouse';
    const holdTimer = holdReady ? null : setTimeout(() => { holdReady = !scrolling; }, HOLD_MS);
    el.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      if (drag) { drag.move(ev); return; }
      if (!holdReady) {
        if (!scrolling && Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return;
        scrolling = true;
        host.scrollTop -= ev.clientY - lastY;
        lastY = ev.clientY;
        return;
      }
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < THRESHOLD) return;
      drag = startDrag(el, item, sx, sy);
      drag.move(ev);
    };
    const unbind = () => {
      if (holdTimer) clearTimeout(holdTimer);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    const onUp = (ev) => { unbind(); if (drag) drag.drop(ev); else if (!scrolling) select(el); };
    const onCancel = () => { unbind(); if (drag) drag.cancel(); };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
  }

  // ---- Drag to move -------------------------------------------------------
  function startDrag(el, item, grabX, grabY) {
    deselect();
    const host = canvas.parentElement;
    const others = items.filter(x => x.id !== item.id);
    const maxBottom = others.reduce((mx, o) => Math.max(mx, o.y + o.h), 0);
    const yCap = Math.max(rows - item.h, maxBottom); // can drop below everything (board scrolls)
    const dwellOn = localStorage.getItem('mf.dragReflow') !== '0';
    const srcRect = el.getBoundingClientRect();
    const otherEls = [...canvas.querySelectorAll('.widget')].filter(w => w !== el);
    const origPos = new Map(others.map(o => [o.id, o]));

    // Fixed clone follows the pointer; the origin becomes a dashed placeholder.
    const clone = el.cloneNode(true);
    clone.classList.add('drag-clone');
    clone.style.left = srcRect.left + 'px'; clone.style.top = srcRect.top + 'px';
    clone.style.width = srcRect.width + 'px'; clone.style.height = srcRect.height + 'px';
    clone.style.gridColumn = clone.style.gridRow = 'auto';
    // Charts clone as blank canvases — copy their pixels so the clone looks like the widget.
    const srcCv = el.querySelectorAll('canvas'), dstCv = clone.querySelectorAll('canvas');
    srcCv.forEach((c, i) => {
      const d = dstCv[i]; if (!d) return;
      d.width = c.width; d.height = c.height;
      try { d.getContext('2d').drawImage(c, 0, 0); } catch (_) {}
    });
    document.body.appendChild(clone);
    el.classList.add('drag-src');

    const ghost = document.createElement('div');
    ghost.className = 'drop-ghost';
    canvas.appendChild(ghost);

    let proj = { x: item.x, y: item.y, w: item.w, h: item.h };
    let dwellTimer = null, previewOn = false, inside = true, done = false;
    let lastEv = null, commitTimer = null, myCancel = null;
    placeGhost(ghost, proj);

    // Auto-scroll the host while the pointer hovers near its top/bottom edge, then re-project.
    const scrollTimer = setInterval(() => {
      if (done || !lastEv) return;
      const hr = host.getBoundingClientRect();
      if (lastEv.clientY < hr.top + EDGE_PX && host.scrollTop > 0) host.scrollTop -= EDGE_STEP;
      else if (lastEv.clientY > hr.bottom - EDGE_PX) host.scrollTop += EDGE_STEP;
      else return;
      move(lastEv);
    }, 50);

    const setPreview = (posById) => flip(otherEls, () =>
      otherEls.forEach(wEl => { const p = posById.get(wEl.dataset.id); if (p) applyPos(wEl, p); }));
    const clearDwell = () => { if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; } };
    const restorePreview = () => { if (previewOn) { setPreview(origPos); previewOn = false; } };
    const cleanup = () => {
      clearDwell();
      clearInterval(scrollTimer);
      clone.remove(); ghost.remove(); el.classList.remove('drag-src');
      window.removeEventListener('keydown', onKey);
      if (active === myCancel) active = null;
    };

    function move(ev) {
      if (done) return;
      lastEv = ev;
      const m = metrics();
      const dx = ev.clientX - grabX, dy = ev.clientY - grabY;
      clone.style.transform = `translate(${dx}px,${dy}px) scale(.97)`;
      // Inside = over the board's VISIBLE area (the canvas can extend above/below the host
      // when scrolled — dropping over the clipped part must cancel, not commit).
      const hr = host.getBoundingClientRect();
      inside = ev.clientX >= m.r.left && ev.clientX <= m.r.right
        && ev.clientY >= Math.max(m.r.top, hr.top) && ev.clientY <= Math.min(m.r.bottom, hr.bottom);
      // Project the dragged rect's top-left onto the board, clamped to it.
      const nx = clamp(Math.round((srcRect.left + dx - m.r.left) / (m.cellW + m.gap)), 0, cols - item.w);
      const ny = clamp(Math.round((srcRect.top + dy - m.r.top) / (m.cellH + m.gap)), 0, yCap);
      if (nx !== proj.x || ny !== proj.y) {
        proj = { ...proj, x: nx, y: ny };
        clearDwell();
        restorePreview();
        if (dwellOn && others.some(o => overlap(proj, o))) {
          dwellTimer = setTimeout(() => { // dwelled on an occupied spot → preview the push
            const pushed = pushDown([{ id: '__drag', ...proj }, ...others], '__drag');
            setPreview(new Map(pushed.filter(p => p.id !== '__drag').map(p => [p.id, p])));
            previewOn = true;
          }, DWELL_MS);
        }
        placeGhost(ghost, proj);
      }
      ghost.style.display = inside ? '' : 'none';
    }

    function drop() {
      if (done) return;
      done = true;
      clearDwell();
      if (!inside) { restorePreview(); cleanup(); return; } // outside the board = cancel
      const changed = proj.x !== item.x || proj.y !== item.y;
      const next = pushDown(items.map(it => it.id === item.id ? { ...it, x: proj.x, y: proj.y } : { ...it }), item.id);
      // Commit feel: FLIP the pushed widgets, glide the clone into the target cell, then save.
      setPreview(new Map(next.filter(p => p.id !== item.id).map(p => [p.id, p])));
      const target = cellPx(metrics(), proj);
      const m = metrics();
      clone.style.transition = 'transform 140ms ease';
      clone.style.transform = `translate(${m.r.left + target.left - srcRect.left}px,${m.r.top + target.top - srcRect.top}px) scale(1)`;
      commitTimer = setTimeout(() => {
        commitTimer = null;
        cleanup();
        if (changed) onChange(next);
      }, 160);
    }

    function cancel() {
      if (done) {
        // Pending commit interrupted by a re-render: tear down now, drop the save.
        if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; cleanup(); }
        return;
      }
      done = true;
      restorePreview();
      cleanup();
    }

    const onKey = (e) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey);
    myCancel = cancel;
    active = myCancel;
    return { move, drop, cancel };
  }

  // ---- Tap to select + edge-handle resize ---------------------------------
  function select(el) {
    if (selected === el) return;
    deselect();
    selected = el;
    el.classList.add('selected');
    const item = byId(el.dataset.id);
    if (!item) return;
    for (const side of ['t', 'r', 'b', 'l']) {
      const h = document.createElement('div');
      h.className = `gh gh-${side}`;
      h.title = t('Drag to resize');
      h.addEventListener('pointerdown', (e) => startResize(e, h, el, item, side));
      el.appendChild(h);
    }
  }

  function deselect() {
    if (!selected) return;
    selected.classList.remove('selected');
    selected.querySelectorAll('.gh').forEach(h => h.remove());
    selected = null;
  }

  function startResize(e, handle, el, item, side) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const def = WIDGETS[item.type] || {};
    const minW = def.minW || 1, minH = def.minH || 1;
    const sx = e.clientX, sy = e.clientY;
    let geo = { x: item.x, y: item.y, w: item.w, h: item.h };
    const ghost = document.createElement('div');
    ghost.className = 'drop-ghost';
    canvas.appendChild(ghost);
    const paint = () => { applyPos(el, geo); placeGhost(ghost, geo); };
    paint();
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      const m = metrics();
      const dc = Math.round((ev.clientX - sx) / (m.cellW + m.gap)); // whole-cell steps
      const dr = Math.round((ev.clientY - sy) / (m.cellH + m.gap));
      const g = { x: item.x, y: item.y, w: item.w, h: item.h };
      if (side === 'r') g.w = clamp(item.w + dc, minW, cols - item.x);
      if (side === 'b') g.h = Math.max(minH, item.h + dr);
      if (side === 'l') { g.x = clamp(item.x + dc, 0, item.x + item.w - minW); g.w = item.x + item.w - g.x; }
      if (side === 't') { g.y = clamp(item.y + dr, 0, item.y + item.h - minH); g.h = item.y + item.h - g.y; }
      if (g.x !== geo.x || g.y !== geo.y || g.w !== geo.w || g.h !== geo.h) { geo = g; paint(); }
    };
    let cancelled = false;
    const unbind = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
      ghost.remove();
      if (active === doCancel) active = null;
    };
    const onUp = () => {
      unbind();
      if (cancelled) return;
      const changed = geo.x !== item.x || geo.y !== item.y || geo.w !== item.w || geo.h !== item.h;
      if (!changed) return;
      onChange(pushDown(items.map(it => it.id === item.id ? { ...it, ...geo } : { ...it }), item.id));
    };
    const onCancel = () => { unbind(); applyPos(el, item); };
    // Escape cancels a resize the same way it cancels a drag.
    const doCancel = () => { cancelled = true; unbind(); applyPos(el, item); };
    const onKey = (kev) => { if (kev.key === 'Escape') doCancel(); };
    window.addEventListener('keydown', onKey);
    active = doCancel;
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
  }
}
