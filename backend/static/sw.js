// ThinQ Sentinel PWA 서비스워커 — 설치/오프라인 셸 + 푸시 수신
const CACHE = 'sentinel-v1';
const SHELL = ['/m', '/static/manifest.json', '/static/icon-192.png', '/static/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 네트워크 우선(API/실시간), 실패 시 캐시 셸 (오프라인 대비)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;  // API는 항상 네트워크
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match('/m'))));
});

// Web Push 수신 (백엔드가 푸시 전송 시) — 앱이 닫혀 있어도 알림
self.addEventListener('push', (e) => {
  let d = { title: 'ThinQ Sentinel', body: '감염위험 경보' };
  try { if (e.data) d = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: '/static/icon-192.png', badge: '/static/icon-192.png',
    vibrate: [200, 100, 200], tag: 'tier-alert', renotify: true,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => {
    for (const c of cs) { if (c.url.includes('/m') && 'focus' in c) return c.focus(); }
    return self.clients.openWindow('/m');
  }));
});
