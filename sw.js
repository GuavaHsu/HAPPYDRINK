const CACHE_NAME = 'accounting-pwa-v7';
const ASSETS_TO_CACHE = [
  './',
  './index_AIO.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './啤酒.png',
  './沙瓦.png',
  './葡萄酒.png',
  './清酒.png',
  './水果酒.png',
  './其他.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js',
  'https://cdn.tailwindcss.com'
];

// 安裝 Service Worker 並快取資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 強制讓等待中的 Service Worker 進入 active 狀態
  self.skipWaiting();
});

// 激活 Service Worker 並清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  // 取得頁面控制權
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. 如果是 Google Apps Script API 請求，直接走網路，不進快取
  if (requestUrl.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. 對於靜態資源與外部 CDN，採用 Stale-While-Revalidate (先快取，並在背景更新) 策略
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            // 只有在 GET 請求且回應成功時才將其存入快取
            if (event.request.method === 'GET' && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // 網路請求失敗時，如果快取也沒有，就返回錯誤
            return cachedResponse;
          });

        // 優先回傳快取回應，否則回傳網路請求
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
