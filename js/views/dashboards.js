// MyFinance — Dashboards (Platform v2, grid canvas)
// Renders a dashboard page: a grid of widgets sized in cells. For now it shows the user's
// first saved page, or a built-in default layout. Composing/creating pages comes in later phases.

import * as DB from '../db.js';
import { loadContext, renderGrid, getCols, DEFAULT_LAYOUT } from '../dashboards/engine.js';

let resizeCols = null;

export async function renderDashboards(container) {
  const ctx = await loadContext();

  let layout = DEFAULT_LAYOUT;
  try {
    const pages = await DB.getAll('dashboards', { order: 'position', ascending: true });
    if (pages.length && Array.isArray(pages[0].layout) && pages[0].layout.length) {
      layout = pages[0].layout;
    }
  } catch (_) { /* table may be empty — fall back to default */ }

  renderGrid(container, layout, ctx);

  // Re-render only when the column breakpoint actually changes (portrait/landscape, desktop),
  // and only while the dashboard tab is still showing (single handler, replaced each render).
  resizeCols = getCols();
  window.onresize = () => {
    const tab = location.hash.replace('#', '') || 'dashboard';
    if (tab !== 'dashboard') return;
    if (getCols() !== resizeCols) { resizeCols = getCols(); renderGrid(container, layout, ctx); }
  };
}
