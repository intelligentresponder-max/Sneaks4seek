// Sneaks4Seek Service Worker — v2.0
const CACHE = 'sneaks4seek-v2';
const ASSETS = [
  '/Sneaks4seek/',
  '/Sneaks4seek/index.html',
  '/Sneaks4seek/manifest.json',
  '/Sneaks4seek/onboarding/index.html',
  '/Sneaks4seek/assets/css/theme.css',
  '/Sneaks4seek/assets/css/components.css',
  '/Sneaks4seek/assets/js/onboarding.js',
  '/Sneaks4seek/assets/js/api.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/Sneaks4seek/'));
    })
  );
});
