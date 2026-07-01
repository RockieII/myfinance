// MyFinance — Main App
// Initializes Supabase, handles auth gate, routes between views.

import { SUPABASE_URL, SUPABASE_ANON_KEY, PLATFORM_V2 } from './config.js';
import { initDB } from './db.js';
import { renderLogin, getSession, signOut } from './auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderDashboards } from './views/dashboards.js';
import { renderTransactions } from './views/transactions.js';
import { renderStocks } from './views/stocks.js';
import { renderCategories } from './views/categories.js';
import { renderSettings } from './views/settings.js';
import { renderHelp } from './views/help.js';
import { loadProfiles } from './profiles.js';

// Service worker
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
}

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
initDB(supabase);

// DOM refs
const viewEl = document.getElementById('view');
const tabLabel = document.getElementById('tab-label');
const tabs = document.querySelectorAll('.tab');
const topbar = document.querySelector('.topbar');
const tabbar = document.querySelector('.tabbar');

// View registry
const views = {
  dashboard:    renderDashboard,
  transactions: renderTransactions,
  stocks:       renderStocks,
  categories:   renderCategories,
  settings:     renderSettings,
  help:         renderHelp,
};

const TAB_LABELS = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  stocks: 'Stocks',
  categories: 'Categories',
  settings: 'Settings',
  help: 'Help & FAQ',
};

// Outlier pages allowed to scroll inside the fixed shell (long lists / docs).
// (Categories + Help are reachable from Settings, not the tab bar.)
const SCROLLABLE_VIEWS = new Set(['categories', 'settings', 'help']);

// Platform v2 (grid dashboards). OFF by default; opt-in per device via a Settings→Developer toggle.
const platformV2 = PLATFORM_V2 || localStorage.getItem('mf.platformV2') === '1';

function getTab() {
  return location.hash.replace('#', '') || 'dashboard';
}

async function render() {
  const tab = getTab();
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  tabLabel.textContent = TAB_LABELS[tab] || tab;
  viewEl.classList.toggle('scrollable', SCROLLABLE_VIEWS.has(tab));
  viewEl.innerHTML = '';

  // Platform v2: the Dashboard tab renders the new grid dashboard.
  const viewFn = (tab === 'dashboard' && platformV2) ? renderDashboards : views[tab];
  if (viewFn) {
    await viewFn(viewEl);
  } else {
    viewEl.innerHTML = '<div class="empty">Unknown view.</div>';
  }
}

// Tab click handlers
tabs.forEach(t => t.addEventListener('click', () => {
  location.hash = t.dataset.tab;
}));
window.addEventListener('hashchange', render);

// Keep the app-wide profile cache warm (used by the transaction form + future widgets).
// Called on boot and after profile edits in Settings.
window.refreshProfiles = loadProfiles;

// Toast utility (globally available)
window.showToast = function(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
};

// Auth gate
async function enterApp() {
  topbar.style.display = '';
  tabbar.style.display = '';
  await loadProfiles();
  render();
}

async function boot() {
  const session = await getSession();
  if (session) {
    enterApp();
  } else {
    topbar.style.display = 'none';
    tabbar.style.display = 'none';
    renderLogin(viewEl, () => {
      location.hash = 'dashboard';
      enterApp();
    });
  }
}

// Listen for auth state changes (e.g., token refresh, logout)
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    boot();
  }
});

boot();
