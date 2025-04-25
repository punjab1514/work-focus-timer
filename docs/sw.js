const CACHE = 'focus-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './popup.js',
  './icons/timer.svg',
  './icons/calendar.svg',
  './icons/stats.svg',
  './icons/notes.svg',
  './icons/settings.svg',
  './sounds/rain.mp3',
  './sounds/coffee.mp3',
  './sounds/white.mp3',
  './sounds/notification.mp3',
  './manifest.webmanifest'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request))
  );
});
