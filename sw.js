self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open('mls-v1').then(c => c.addAll([
      '/', '/index.html',
      '/theme.css', '/manifest.json',
      '/icon-192.png', '/icon-512.png',
      '/favicon.ico'
    ]))
  );
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
