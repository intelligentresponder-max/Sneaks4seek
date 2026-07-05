// Sneaks4Seek Service Worker — v1.0
const CACHE = 'sneaks4seek-v1';
const ASSETS = [
  '/sneaks4seek/',
  '/sneaks4seek/index.html',
  '/sneaks4seek/sox.html',
  '/sneaks4seek/ankauf.html',
  '/sneaks4seek/verkaufen.htm',
  '/sneaks4seek/katalog.html',
  '/sneaks4seek/manifest.json',
  '/sneaks4seek/spin-poster.jpg',
  '/sneaks4seek/sox-1.jpg',
  '/sneaks4seek/sox-2.jpg',
  '/sneaks4seek/sox-3.jpg',
  '/sneaks4seek/magic-sox-1.jpg',
  '/sneaks4seek/magic-sox-2.jpg',
  '/sneaks4seek/magic-sox-3.jpg',
];

// Install — Cache alle Assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — alten Cache löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — Cache first, dann Network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Neue Ressourcen auch cachen
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/sneaks4seek/'));
    })
  );
});
