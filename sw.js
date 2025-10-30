// Простой Service Worker - только для установки
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('PWA установлен');
});