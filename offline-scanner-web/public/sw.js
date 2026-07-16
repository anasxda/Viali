const CACHE = 'viali-scanner-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['./','./manifest.webmanifest','./icon.svg']))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response; }))));
