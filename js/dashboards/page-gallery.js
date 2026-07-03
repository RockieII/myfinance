// MyFinance — Page gallery
// Opened by the sidebar's "+ Page": a wide sheet with a ONE-row template carousel — a
// "Blank page" card first, then every PREBUILT template as a schematic mini-board (blocks
// positioned per the template layout, tinted with the template theme's accent). Click = create.

import * as nav from '../nav.js';
import { openSheet } from '../sheet.js';
import { PREBUILT } from './prebuilt.js';
import { WIDGETS } from './registry.js';
import { getTheme } from './themes.js';
import { t } from '../i18n.js';

const uid = () => 'w' + Math.random().toString(36).slice(2, 8);
const instantiate = (layout) => layout.map(it => ({ id: uid(), ...it }));

export async function createFromTemplate(tpl) {
  const row = await nav.createPage({
    name: tpl ? t(tpl.name) : t('New page'),   // stored name follows the display language at creation
    theme: tpl ? tpl.theme : 'default',
    icon: tpl?.icon || 'ph-squares-four',
    layout: tpl ? instantiate(tpl.layout) : [],
  });
  nav.setCurrent(row.id);
  const tab = location.hash.replace('#', '');
  if (tab === '' || tab === 'dashboard') window.rerenderApp?.();
  else location.hash = 'dashboard';
  return row;
}

// Schematic mini-board: a 4-col grid mirroring the template layout, blocks tinted with the
// template theme's accent at low opacity + the (tiny) widget titles.
function boardHTML(tpl) {
  const acc = getTheme(tpl.theme).accent;
  return `<div class="pg-board">${tpl.layout.map(it => `
    <div class="pg-block" style="grid-column:span ${Math.min(it.w, 4)};grid-row:span ${it.h};background:${acc}24;color:${acc}">
      <span>${t(WIDGETS[it.type]?.title || '')}</span>
    </div>`).join('')}</div>`;
}

export async function openPageGallery() {
  const { el, close } = openSheet(`
    <div class="lib-head">
      <h3 class="lib-title">${t('New page')}</h3>
      <button class="btn-icon" data-close title="${t('Close')}"><i class="ph ph-x"></i></button>
    </div>
    <div class="pg-carousel">
      <button class="pg-card" data-tpl="">
        <div class="pg-board pg-blank"><i class="ph ph-plus"></i></div>
        <div class="pg-name">${t('Blank page')}</div>
        <div class="fs-12 text-dim">${t('Start from scratch')}</div>
      </button>
      ${PREBUILT.map((tpl, i) => `
        <button class="pg-card" data-tpl="${i}">
          ${boardHTML(tpl)}
          <div class="pg-name"><i class="ph ${tpl.icon || 'ph-squares-four'}"></i> ${t(tpl.name)}</div>
          <div class="fs-12 text-dim">${t('{n} widgets', { n: tpl.layout.length })}</div>
        </button>`).join('')}
    </div>`, { wide: true });

  el.querySelector('[data-close]').addEventListener('click', close);
  el.querySelectorAll('[data-tpl]').forEach(b => b.addEventListener('click', async () => {
    const tpl = b.dataset.tpl === '' ? null : PREBUILT[+b.dataset.tpl];
    close();
    try { await createFromTemplate(tpl); }
    catch (err) { showToast(t('Could not add page') + ': ' + err.message); }
  }));
}
