// Sneaks4Seek Service Worker — v3.0
// Netzwerk-zuerst statt Cache-zuerst: wichtig, weil api.js/onboarding.js die
// Backend-URL enthalten, die sich ändern kann — ein dauerhaft gecachtes
// api.js mit toter URL hätte echten Verkäufern das Onboarding lautlos
// kaputt gemacht, ohne dass irgendwer online davon etwas gemerkt hätte.
// Offline-Fallback bleibt erhalten (Cache nur, wenn das Netzwerk fehlschlägt).
const CACHE = 'sneaks4seek-v4';
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
    fetch(e.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/Sneaks4seek/')))
  );
});
