// MyFinance — Main App
// Initializes Supabase, handles auth gate, routes between views.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { initDB } from './db.js';
import { renderLogin, getSession, signOut } from './auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderStocks } from './views/stocks.js';
import { renderCategories } from './views/categories.js';
import { renderSettings } from './views/settings.js';
import { renderHelp } from './views/help.js';
import { loadProfiles, getProfiles, getActiveProfile, setActiveProfile } from './profiles.js';

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
const profileSwitcher = document.getElementById('profile-switcher');

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

function getTab() {
  return location.hash.replace('#', '') || 'dashboard';
}

async function render() {
  const tab = getTab();
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  tabLabel.textContent = TAB_LABELS[tab] || tab;
  viewEl.classList.toggle('scrollable', SCROLLABLE_VIEWS.has(tab));
  viewEl.innerHTML = '';

  const viewFn = views[tab];
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

// Profile switcher (header). Hidden until the account has profiles.
function populateProfileSwitcher() {
  const list = getProfiles();
  if (!list.length) { profileSwitcher.hidden = true; profileSwitcher.innerHTML = ''; return; }
  const active = getActiveProfile();
  profileSwitcher.innerHTML = `<option value="">All profiles</option>` +
    list.map(p => `<option value="${p.id}" ${p.id === active ? 'selected' : ''}>${p.name}</option>`).join('');
  profileSwitcher.hidden = false;
}
profileSwitcher.addEventListener('change', () => { setActiveProfile(profileSwitcher.value); render(); });

// Reload profiles + refresh the switcher (called on boot and after profile edits in Settings).
async function refreshProfiles() {
  await loadProfiles();
  populateProfileSwitcher();
}
window.refreshProfiles = refreshProfiles;

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
  await refreshProfiles();
  render();
}

async function boot() {
  const session = await getSession();
  if (session) {
    enterApp();
  } else {
    topbar.style.display = 'none';
    tabbar.style.display = 'none';
    profileSwitcher.hidden = true;
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
