const CACHE = 'focus-timer-v1';
const assets = [
  './',
  './index.html',
  './popup.css',
  './popup.js',
  './manifest.webmanifest',
  './icons/icon16.png',
  './icons/icon48.png',
  './icons/icon128.png',
  './sounds/rain.mp3',
  './sounds/coffee.mp3',
  './sounds/white.mp3',
  './sounds/notification.mp3'
];

self.addEventListener('install', evt =>
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(assets))
  )
);

self.addEventListener('fetch', evt =>
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request))
  )
);
