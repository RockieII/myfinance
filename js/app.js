// MyFinance — Main App
// The sidebar (dashboard pages, in folders) is the primary nav; Data + Settings live in the header.
// Routes: '' / 'dashboard' → the selected dashboard page; 'data' / 'settings' / 'categories' / 'help'.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { initDB } from './db.js';
import { renderLogin, getSession } from './auth.js';
import { renderDashboards } from './views/dashboards.js';
import { renderData } from './views/data.js';
import { renderCategories } from './views/categories.js';
import { renderSettings } from './views/settings.js';
import { renderHelp } from './views/help.js';
import { loadProfiles } from './profiles.js';
import { openPageGallery } from './dashboards/page-gallery.js';
import { t } from './i18n.js';
import * as nav from './nav.js';

// Service worker
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
initDB(supabase);

// DOM refs
const viewEl = document.getElementById('view');
const tabLabel = document.getElementById('tab-label');
const sidebarEl = document.getElementById('sidebar');
const backdrop = document.getElementById('nav-backdrop');

const SPECIAL = { data: renderData, settings: renderSettings, categories: renderCategories, help: renderHelp };
const LABELS = { data: 'Data', settings: 'Settings', categories: 'Categories', help: 'Help & FAQ' };
const SCROLLABLE_VIEWS = new Set(['settings', 'categories', 'help']);

const getTab = () => location.hash.replace('#', '');   // '' = dashboard
const isDashTab = (t) => t === '' || t === 'dashboard';
const activeKey = () => (isDashTab(getTab()) ? 'p:' + nav.getCurrentId() : getTab());

function renderSidebarNow() {
  nav.renderSidebar(sidebarEl, activeKey(), {
    onSelectPage: (id) => {
      nav.setCurrent(id);
      closeDrawer();
      if (isDashTab(getTab())) render(); else location.hash = 'dashboard';
    },
    onAddPage: () => {
      closeDrawer();
      openPageGallery();
    },
  });
}

async function render() {
  const tab = getTab();
  // Leaving the dashboard invalidates its cached data context, so returning (e.g. after a Data
  // edit) reloads; switching between pages stays cached (no refetch per page tap).
  if (!isDashTab(tab)) window.invalidateDashboards?.();
  viewEl.classList.toggle('scrollable', SCROLLABLE_VIEWS.has(tab));
  viewEl.innerHTML = '';
  renderSidebarNow();

  if (isDashTab(tab)) {
    tabLabel.textContent = nav.getPage(nav.getCurrentId())?.name || t('Dashboard');
    await renderDashboards(viewEl);
  } else {
    tabLabel.textContent = LABELS[tab] ? t(LABELS[tab]) : tab;
    const fn = SPECIAL[tab];
    if (fn) await fn(viewEl); else viewEl.innerHTML = `<div class="empty">${t('Unknown view.')}</div>`;
  }
}

window.addEventListener('hashchange', render);

// Globals used by views to refresh cross-cutting UI.
window.refreshProfiles = loadProfiles;      // after profile edits (Settings)
window.refreshNav = renderSidebarNow;        // after page rename/icon/folder edits
window.rerenderApp = render;                 // after page create/delete (navigate + refresh)

// Header buttons
document.getElementById('data-btn').addEventListener('click', () => { location.hash = 'data'; });
document.getElementById('settings-btn').addEventListener('click', () => { location.hash = 'settings'; });

const sidebarToggle = document.getElementById('sidebar-toggle');
// Localize the static header controls (index.html markup can't call t()).
sidebarToggle.title = t('Collapse / expand menu');
sidebarToggle.setAttribute('aria-label', t('Toggle menu'));
const dataBtn = document.getElementById('data-btn');
dataBtn.title = t('Add / manage data');
dataBtn.setAttribute('aria-label', t('Data'));
const settingsBtn = document.getElementById('settings-btn');
settingsBtn.title = t('Settings');
settingsBtn.setAttribute('aria-label', t('Settings'));
sidebarEl.setAttribute('aria-label', t('Dashboards'));
if (localStorage.getItem('mf.sidebarCollapsed') === '1') document.body.classList.add('sidebar-collapsed');
sidebarToggle.addEventListener('click', () => {
  if (window.innerWidth >= 769) {   // desktop: collapse to icon rail
    const c = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('mf.sidebarCollapsed', c ? '1' : '0');
  } else {                          // mobile: open/close the drawer
    document.body.classList.toggle('nav-open');
  }
});
function closeDrawer() { document.body.classList.remove('nav-open'); }
backdrop.addEventListener('click', closeDrawer);

// Toast utility (globally available)
window.showToast = function (msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
};

// Auth gate
async function enterApp() {
  document.body.classList.add('authed');
  await Promise.all([loadProfiles(), nav.loadNav()]);
  render();
}

async function boot() {
  const session = await getSession();
  if (session) {
    enterApp();
  } else {
    document.body.classList.remove('authed');
    // Note: don't reset the hash here — a hashchange during enterApp's async load would race a
    // second render() before nav loads (risking a duplicate default page). enterApp renders once.
    renderLogin(viewEl, () => enterApp());
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { document.body.classList.remove('authed'); boot(); }
});

boot();
