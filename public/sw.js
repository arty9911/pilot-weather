const CACHE_NAME = 'avbrief-shell-v3'; // 업데이트할 때마다 버전을 올려 이전 캐시를 정리
const SHELL_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 요청(METAR/TAF/기상청/레이더)은 항상 최신 데이터가 중요하므로 캐시하지 않음
  if (url.pathname.startsWith('/api/')) {
    return; // 네트워크로 그대로 통과
  }

  // 같은 출처의 정적 파일: 네트워크를 먼저 시도하고, 실패(오프라인)할 때만 캐시로 대체
  // (캐시 우선 방식은 파일을 새로 배포해도 계속 옛 버전을 보여주는 문제가 있어 변경함)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

