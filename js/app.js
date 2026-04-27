// MyFinance — entry point
// Registers service worker and sets up tab routing.

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js');
}

// TODO: import views and wire up hash-based routing
// TODO: initialize Supabase auth gate

const tabs = document.querySelectorAll('.tab');
const view = document.getElementById('view');
const tabLabel = document.getElementById('tab-label');

function getTab() {
  return location.hash.replace('#', '') || 'dashboard';
}

function render() {
  const tab = getTab();
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  tabLabel.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  view.innerHTML = `<div class="empty">Select a tab to get started.</div>`;
}

tabs.forEach(t => t.addEventListener('click', () => {
  location.hash = t.dataset.tab;
}));

window.addEventListener('hashchange', render);
render();
