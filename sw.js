const CACHE = 'city-dash-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './preethi.png',
  './game_background_city.png',
  './src/game/Game.js',
  './src/game/Player.js',
  './src/game/PreethiRunner.js',
  './src/game/AnimationController.js',
  './src/game/CollisionSystem.js',
  './src/game/EnvironmentBuilder.js',
  './src/game/TrackManager.js',
  './src/game/VFXManager.js',
  './src/game/SoundManager.js',
  './src/game/FirebaseMock.js',
  './src/ui/UIManager.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
