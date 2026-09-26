/* 貓咪邏輯謎題 Service Worker：App Shell + 離線可玩。
 * 同源資源一律「網路優先、離線退回快取」，所以更新不必手動改版本號，也不會新舊檔混用。
 * 只有快取結構改變時才需要改 SHELL 名稱（activate 會清掉舊的）。 */
const PREFIX = 'meowdoku';
const SHELL = `${PREFIX}-shell-v2`;
const APP_SHELL = [
  './', './index.html', './engine.js', './gen-worker.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './icons/cats.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL]);
    for (const key of await caches.keys()) {
      if (key.startsWith(`${PREFIX}-`) && !keep.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh.ok) {
        const cache = await caches.open(SHELL);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
