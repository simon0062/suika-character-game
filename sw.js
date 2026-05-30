// sw.js — 不再缓存，始终走网络

self.addEventListener('install', () => {
    // 跳过等待，立即激活
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // 清除所有旧缓存
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
    // 立即接管所有页面
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // 全部走网络，不缓存
    event.respondWith(fetch(event.request));
});
