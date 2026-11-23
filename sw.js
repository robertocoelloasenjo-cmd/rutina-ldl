// Service worker: hace que la app funcione sin conexión.
// Estrategia "primero la red": si hay conexión se descarga la versión más reciente
// (y se guarda en caché); si no hay conexión o tarda más de 3 s, se usa la caché.
// Así una versión nueva publicada en GitHub Pages llega sola en la siguiente apertura.
// Cambia VERSION al añadir o renombrar archivos de la lista.

const VERSION = 'v7';
const CACHE = `rutina-ldl-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/storage.js',
  'js/defaults.js',
  'js/util.js',
  'js/stats.js',
  'js/views.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rutina-ldl-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)); }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    try {
      return await Promise.race([network, timeout(3000)]);
    } catch (_) {
      const cached = await cache.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      if (cached) return cached;
      return network; // sin caché: esperar a la red
    }
  })());
});
