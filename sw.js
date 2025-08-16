// sw.js — cache-first + auto-update
const CACHE = 'mls-v3'; // ← เปลี่ยนชื่อทุกครั้งที่แก้ asset สำคัญ
const ASSETS = [
  '/', '/index.html',
  '/theme.css', '/manifest.json', '/app.js',
  '/icon-192.png', '/icon-512.png',
  '/favicon.ico', '/apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // นำทางหน้า (พิมพ์ URL โดยตรง / refresh) ให้ fallback เป็น index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // อย่างอื่น: cache-first แล้วค่อย network
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(resp => {
        // ใส่ของใหม่ลง cache (เฉพาะ GET/200/basic)
        if (req.method === 'GET' && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      })
    )
  );
});
