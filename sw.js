/* Spannometro service worker: keeps the app usable offline. */
const CACHE = 'spannometro-2026-10-15-1';
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./big-shoulders-display-latin-700-normal.woff2",
  "./big-shoulders-display-latin-800-normal.woff2",
  "./martian-mono-latin-400-normal.woff2",
  "./martian-mono-latin-600-normal.woff2",
  "./schibsted-grotesk-latin-400-normal.woff2",
  "./schibsted-grotesk-latin-500-normal.woff2",
  "./schibsted-grotesk-latin-600-normal.woff2",
  "./schibsted-grotesk-latin-700-normal.woff2"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Pages: try the network first (so updates show at once), fall back to the saved copy offline.
   Everything else: serve from cache at once and refresh it in the background. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))]);
        if (res && res.ok) { cache.put(req, res.clone()); return res; }
        throw new Error('bad response');
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true }) ||
        (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      if (cached) { event.waitUntil(network); return cached; }
      return network;
    })
  );
});
