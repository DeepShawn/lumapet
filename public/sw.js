const CACHE = 'lumapet-shell-v2';
const SCOPE = self.registration.scope;
const SHELL = [new URL('./', SCOPE).href, new URL('index.html', SCOPE).href, new URL('manifest.webmanifest', SCOPE).href, new URL('icon.svg', SCOPE).href];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const store = (response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  };
  // Pages go network-first so a new release shows up on the next visit;
  // hashed assets never change, so they can come straight from the cache.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(store).catch(() => caches.match(request).then((cached) => cached || caches.match(new URL('index.html', SCOPE).href))));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(store)));
});
