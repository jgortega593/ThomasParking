const CACHE_NAME = 'parqueadero-cache-v3';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/index-CHmBpY1W.js',
  '/assets/styles.css'
];

// Instalación: Cachear recursos + offline.html
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Precaché de recursos críticos
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting()) // Activa SW inmediatamente
      .catch(error => {
        console.error('Error durante la instalación:', error);
      })
  );
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim()) // Controlar todas las pestañas
  );
});

// Estrategia: Cache First + Actualización en background + Offline fallback
self.addEventListener('fetch', (event) => {
  // Ignorar solicitudes no-GET y de otros orígenes
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. Respuesta desde caché si existe
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. Intentar red y cachear respuesta
        return fetch(event.request)
          .then(networkResponse => {
            // Clonar respuesta para cachear
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache))
              .catch(error => {
                console.error('Error al cachear:', error);
              });

            return networkResponse;
          })
          .catch(async (error) => {
            // 3. Manejo de errores
            if (event.request.mode === 'navigate') {
              // Fallback para navegación (página offline)
              return caches.match(OFFLINE_URL);
            }
            
            // Fallback para recursos estáticos
            const cache = await caches.open(CACHE_NAME);
            return cache.match(event.request.url) || Response.error();
          });
      })
  );
});
