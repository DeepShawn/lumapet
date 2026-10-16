const CACHE = 'lumapet-shell-v1';
const SCOPE = self.registration.scope;
const SHELL = [new URL('./', SCOPE).href, new URL('index.html', SCOPE).href, new URL('manifest.webmanifest', SCOPE).href, new URL('icon.svg', SCOPE).href];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(new URL('index.html', SCOPE).href))));
});
