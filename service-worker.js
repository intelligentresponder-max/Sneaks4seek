// Sneaks4Seek Service Worker — v1.0
const CACHE = 'sneaks4seek-v1';
const ASSETS = [
  '/Sneaks4seek/',
  '/Sneaks4seek/index.html',
  '/Sneaks4seek/sox.html',
  '/Sneaks4seek/ankauf.html',
  '/Sneaks4seek/verkaufen.htm',
  '/Sneaks4seek/katalog.html',
  '/Sneaks4seek/manifest.json',
  '/Sneaks4seek/spin-poster.jpg',
  '/Sneaks4seek/sox-1.jpg',
  '/Sneaks4seek/sox-2.jpg',
  '/Sneaks4seek/sox-3.jpg',
  '/Sneaks4seek/magic-sox-1.jpg',
  '/Sneaks4seek/magic-sox-2.jpg',
  '/Sneaks4seek/magic-sox-3.jpg',
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
      }).catch(() => caches.match('/Sneaks4seek/'));
    })
  );
});
