const CACHE = 'focus-timer-v1';
const assets = [
  './',
  './index.html',
  './timer.html',
  './schedule.html',
  './stats.html',
  './notes.html',
  './settings.html',
  './styles.css',
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

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', evt => {
  // (optional) clean up old caches here
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
      .then(cached => cached || fetch(evt.request))
  );
});
