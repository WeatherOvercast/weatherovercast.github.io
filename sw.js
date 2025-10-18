const CACHE_NAME = 'weather-overcast-v1.2.0';
const urlsToCache = [
  './',
  './index.html',
  './style.css', 
  './script.js',
  './manifest.json',
  './icons/maskable-icon.png',
  './icons/maskable-icon-512.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Установлен');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Кеширование файлов');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Все файлы закешированы');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Активирован');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cache) {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Удаляем старый кеш', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Активация завершена');
      return self.clients.claim();
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', function(event) {
  // Пропускаем запросы к API и картам
  if (event.request.url.includes('api.openweathermap.org') || 
      event.request.url.includes('api-maps.yandex.ru') ||
      event.request.url.includes('fonts.googleapis.com')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Если файл есть в кеше - возвращаем его
        if (response) {
          return response;
        }

        // Если нет - делаем сетевой запрос
        return fetch(event.request).then(function(response) {
          // Проверяем валидный ли ответ
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Клонируем ответ
          const responseToCache = response.clone();

          // Добавляем в кеш
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(function() {
        // Fallback для offline режима
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Фоновая синхронизация (для обновления данных)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Фоновая синхронизация');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Здесь можно добавить логику фонового обновления данных
  console.log('Обновление данных в фоне...');
}