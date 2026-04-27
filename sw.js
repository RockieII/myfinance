const CACHE_NAME = 'myfinance-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './js/app.js',
  './js/config.js',
  './js/db.js',
  './js/auth.js',
  './js/views/dashboard.js',
  './js/views/transactions.js',
  './js/views/stocks.js',
  './js/views/categories.js',
  './js/views/settings.js',
  './icons/icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for CDN, Supabase API, and Finnhub API
  if (url.host !== location.host || url.host.includes('supabase') || url.host.includes('finnhub')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
