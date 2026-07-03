// MyFinance — Page personalization (right style sidebar)
// applyPageTheme() paints resolved theme props onto a page's grid host: font-family plus the
// --pg-accent / --pg-radius / --pg-gap vars and pg-* classes that css/personalize.css hooks into.
// openPersonalize({ page, onChange }) opens the style panel — one reusable <aside> appended to
// document.body (outside #view, so it survives draw() re-renders): a docked panel that shifts
// #view on desktop (≥769px, body.style-open), an overlay drawer with backdrop on mobile.
// Every control applies immediately: it rebuilds the stored theme field — the preset id while
// the page matches a pristine preset, else the JSON string {base, accent, font, bg, radius,
// shadow, density, hideTitles} — and hands it to onChange (the caller persists + redraws).

import { THEMES, resolveTheme } from './themes.js';
import { t } from '../i18n.js';

const PROP_KEYS = ['accent', 'font', 'bg', 'radius', 'shadow', 'density', 'hideTitles'];
const RADII = { sharp: '8px', default: '14px', round: '22px' };
const GAPS = { compact: '6px', cozy: '10px', roomy: '16px' };
// Font stacks must stay literally identical to the preset fonts in themes.js so chips light up.
const FONTS = [
  { name: 'System', cls: '', stack: '' },
  { name: 'Serif', cls: 'ff-serif', stack: 'Georgia, "Times New Roman", serif' },
  { name: 'Mono', cls: 'ff-mono', stack: 'ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace' },
  { name: 'Rounded', cls: 'ff-rounded', stack: '"Segoe UI Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
];
const SWATCHES = [...new Set(Object.values(THEMES).map(th => th.accent))];

export function applyPageTheme(host, props) {
  host.style.fontFamily = props.font || '';
  host.style.setProperty('--pg-accent', props.accent);
  host.style.setProperty('--pg-radius', RADII[props.radius] || RADII.default);
  host.style.setProperty('--pg-gap', GAPS[props.density] || GAPS.cozy);
  host.classList.toggle('pg-bg-tint', props.bg === 'tint');
  host.classList.toggle('pg-bg-gradient', props.bg === 'gradient');
  host.classList.toggle('pg-flat', props.shadow === 'flat');
  host.classList.toggle('pg-hide-titles', !!props.hideTitles);
}

let panel = null;
let state = null;               // { page, onChange } of the page being styled

export function openPersonalize({ page, onChange }) {
  state = { page, onChange };
  ensurePanel();
  render();
  document.body.classList.add('style-open');
}

function closePanel() { document.body.classList.remove('style-open'); }

// Called by the dashboard view on every draw: a page switch (which happens without a hash
// change) must not leave the panel bound to the previous page — its edits would silently
// persist to a page that is no longer on screen.
export function syncPersonalize(pageId) {
  if (state && state.page?.id !== pageId) closePanel();
}

function ensurePanel() {
  if (panel) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'style-backdrop';
  backdrop.addEventListener('click', closePanel);
  panel = document.createElement('aside');
  panel.className = 'style-panel';
  panel.setAttribute('aria-label', t('Page style'));
  document.body.append(backdrop, panel);
  window.addEventListener('hashchange', closePanel);   // navigating away closes the panel
  // Escape closes the panel — unless a sheet is open on top (the topmost layer consumes it).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('.sheet-backdrop')) closePanel();
  });
}

// The preset the current field is based on ('default' when unknown/legacy).
function currentBase() {
  const f = state.page.theme;
  if (typeof f === 'string' && f.startsWith('{')) {
    try { const b = JSON.parse(f).base; if (THEMES[b]) return b; } catch (_) { /* ignore */ }
    return 'default';
  }
  return THEMES[f] ? f : 'default';
}

function setField(field) {
  state.page.theme = field;      // reflect immediately; the caller re-assigns when persisting
  state.onChange(field);
  render();
}

// Mutate the resolved props, then store the preset id if the result is pristine, else JSON.
function applyProp(mutate) {
  const base = currentBase();
  const props = resolveTheme(state.page.theme);
  mutate(props);
  const pristine = resolveTheme(base);
  setField(PROP_KEYS.every(k => props[k] === pristine[k]) ? base
    : JSON.stringify({ base, ...Object.fromEntries(PROP_KEYS.map(k => [k, props[k]])) }));
}

function render() {
  if (!panel || !state) return;
  const props = resolveTheme(state.page.theme);
  const base = currentBase();
  const accentCustom = !SWATCHES.some(c => c.toLowerCase() === props.accent.toLowerCase());
  const fontIdx = FONTS.findIndex(f => f.stack === (props.font || ''));
  const reflow = localStorage.getItem('mf.dragReflow') !== '0';
  const chips = (attr, cur, opts) => `<div class="chip-row">${opts.map(o =>
    `<button class="style-chip ${o.cls || ''}${cur === o.v ? ' active' : ''}" data-${attr}="${o.v}">${o.label}</button>`).join('')}</div>`;

  panel.innerHTML = `
    <div class="style-head">
      <h3>${t('Personalize')}</h3>
      <button class="btn-icon" data-close title="${t('Close')}"><i class="ph ph-x"></i></button>
    </div>
    <div class="style-body">
      <div class="style-section">
        <div class="style-label">${t('Theme')}</div>
        <div class="theme-grid">${Object.entries(THEMES).map(([id, th]) =>
          `<button class="theme-chip${base === id ? ' active' : ''}" data-preset="${id}"><span class="theme-dot" style="background:${th.accent}"></span>${t(th.name)}</button>`).join('')}</div>
      </div>
      <div class="style-section">
        <div class="style-label">${t('Accent')}</div>
        <div class="sw-grid">
          ${SWATCHES.map(c => `<button class="sw${!accentCustom && c.toLowerCase() === props.accent.toLowerCase() ? ' active' : ''}" data-accent="${c}" style="background:${c}" title="${c}"></button>`).join('')}
          <label class="sw sw-custom${accentCustom ? ' active' : ''}" title="${t('Custom color')}"><input type="color" value="${props.accent}"></label>
        </div>
      </div>
      <div class="style-section">
        <div class="style-label">${t('Font')}</div>
        ${chips('font', fontIdx, FONTS.map((f, i) => ({ v: i, label: t(f.name), cls: f.cls })))}
      </div>
      <div class="style-section">
        <div class="style-label">${t('Background')}</div>
        ${chips('bg', props.bg, [{ v: 'none', label: t('None') }, { v: 'tint', label: t('Tint') }, { v: 'gradient', label: t('Gradient') }])}
      </div>
      <div class="style-section">
        <div class="style-label">${t('Widgets')}</div>
        <div class="style-row"><span class="style-row-lbl">${t('Radius')}</span>${chips('radius', props.radius, [{ v: 'sharp', label: t('Sharp') }, { v: 'default', label: t('Default') }, { v: 'round', label: t('Round') }])}</div>
        <div class="style-row"><span class="style-row-lbl">${t('Shadow')}</span>${chips('shadow', props.shadow, [{ v: 'soft', label: t('Soft') }, { v: 'flat', label: t('Flat') }])}</div>
        <div class="style-row"><span class="style-row-lbl">${t('Density')}</span>${chips('density', props.density, [{ v: 'compact', label: t('Compact') }, { v: 'cozy', label: t('Cozy') }, { v: 'roomy', label: t('Roomy') }])}</div>
        <label class="style-toggle"><span>${t('Hide widget titles')}</span><input type="checkbox" data-titles${props.hideTitles ? ' checked' : ''}></label>
      </div>
      <div class="style-section">
        <div class="style-label">${t('Behavior')}</div>
        <label class="style-toggle"><span>${t('Widgets move aside while dragging')}</span><input type="checkbox" data-reflow${reflow ? ' checked' : ''}></label>
      </div>
    </div>`;

  panel.querySelector('[data-close]').addEventListener('click', closePanel);
  panel.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => setField(b.dataset.preset)));
  panel.querySelectorAll('[data-accent]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.accent = b.dataset.accent; })));
  panel.querySelector('.sw-custom input').addEventListener('change', (e) => applyProp(p => { p.accent = e.target.value.toUpperCase(); }));
  panel.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.font = FONTS[+b.dataset.font].stack; })));
  panel.querySelectorAll('[data-bg]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.bg = b.dataset.bg; })));
  panel.querySelectorAll('[data-radius]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.radius = b.dataset.radius; })));
  panel.querySelectorAll('[data-shadow]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.shadow = b.dataset.shadow; })));
  panel.querySelectorAll('[data-density]').forEach(b => b.addEventListener('click', () => applyProp(p => { p.density = b.dataset.density; })));
  panel.querySelector('[data-titles]').addEventListener('change', (e) => applyProp(p => { p.hideTitles = e.target.checked; }));
  // Behavior pref — device-local, NOT part of the theme field (frozen key, read by grid-dnd).
  panel.querySelector('[data-reflow]').addEventListener('change', (e) => localStorage.setItem('mf.dragReflow', e.target.checked ? '1' : '0'));
}
