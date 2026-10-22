// Makes Gridshot installable and quick to reopen. Pages are network-first, so a deploy shows up on the
// next load; the hashed files under /assets/ never change, so they are served from the cache.
// Only same-origin GETs under /gridshot/ are handled; the leaderboard API always goes to the network.
const CACHE = 'gridshot-v1';
const BASE = '/gridshot/';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const remember = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => remember(request, response))
        .catch(() => caches.match(request).then(cached => cached || caches.match(BASE)))
    );
    return;
  }
  if (url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => remember(request, response))));
  }
});
