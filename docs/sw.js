const CACHE_NAME = 'focus-timer-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/popup.css',
  '/popup.js',
  '/manifest.webmanifest',
  '/icons/icon128.png',
  '/sounds/rain.mp3',
  '/sounds/coffee.mp3',
  '/sounds/white.mp3',
  '/sounds/notification.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
