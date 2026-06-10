const CACHE_NAME = 'vkachalke-202606041705';

const STATIC_ASSETS = [
  '/img/logoindex.svg',
  '/img/logk.svg',
  '/img/fav.svg'
];

// При установке — кэшируем только картинки
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// При активации — сразу берём управление, старый кэш удаляем
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Стратегия загрузки файлов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // HTML файлы — всегда с сервера (свежие)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // CSS и JS с версией (?v=...) — сначала сеть, потом кэш
  if (url.search.includes('v=')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Всё остальное — кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});