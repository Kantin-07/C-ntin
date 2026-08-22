/* KANTİN service worker — ilk yüklemede CDN + uygulama dosyalarını cache'ler */
const CACHE = 'kantin-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Cache skip:', url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('unpkg.com') || req.url.includes('cdn.sheetjs.com'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      // Navigasyon / HTML: network-first, offline'da cache
      if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        return network.then((r) => r || cached || caches.match('./index.html'));
      }
      // Diğer: cache-first
      return cached || network;
    })
  );
});
