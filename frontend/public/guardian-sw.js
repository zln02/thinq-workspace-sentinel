// 보호자 앱 Service Worker — PWA 설치 가능 최소 구현(네트워크 우선, 데모 stale 방지)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  // SSE/API는 항상 네트워크. 정적은 네트워크 우선 + 오프라인 폴백 없음(데모).
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
