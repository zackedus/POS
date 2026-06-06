/* Barokah POS — service worker (Sprint 11 offline shell for /pos) */
const CACHE_VERSION = 'barokah-pos-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const SHELL_URLS = ['/pos', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('barokah-pos-') && key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache Next.js build assets — prevents stale chunk errors after deploy/HMR.
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/v1/')) {
    return;
  }

  if (!url.pathname.startsWith('/pos') && url.pathname !== '/login') {
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response.ok && request.mode !== 'navigate') {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const fallback = await cache.match('/pos');
        if (fallback) {
          return fallback;
        }
        throw new Error('offline');
      }
    }),
  );
});
