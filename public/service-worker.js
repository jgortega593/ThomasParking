const CACHE_NAME = 'thomasparking-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  OFFLINE_URL
];

// 1. Instalación: Precaché de recursos críticos con logs
self.addEventListener('install', (event) => {
  console.log('[SW] Evento: install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Intentando cachear recursos:', PRECACHE_ASSETS);
        return Promise.all(
          PRECACHE_ASSETS.map(url => {
            return fetch(url)
              .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);
                console.log(`[SW] [OK] Cacheado: ${url}`);
                return cache.put(url, response);
              })
              .catch(error => {
                console.error(`[SW] [ERROR] Falló cacheo de: ${url} | Razón: ${error.message}`);
                // No lanzar error para que otros archivos sigan cacheándose
              });
          })
        );
      })
      .then(() => {
        console.log('[SW] Precaché completado. Activando SW...');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error durante la precaché:', error);
      })
  );
});

// 2. Activación: Limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Evento: activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Eliminando caché antiguo: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Cachés antiguos eliminados. Tomando control de los clientes.');
      return self.clients.claim();
    })
  );
});

// 3. Fetch: Estrategia Cache First + Network fallback + logs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes no HTTP/HTTPS y métodos no GET
  if (!url.protocol.startsWith('http') || request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        console.log(`[SW] [CACHE] Sirviendo desde caché: ${request.url}`);
        return cachedResponse;
      }
      // No está en caché, intentar red
      return fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, networkResponse.clone());
                console.log(`[SW] [NETWORK] Cacheado nuevo recurso: ${request.url}`);
              });
          }
          return networkResponse;
        })
        .catch(error => {
          console.warn(`[SW] [OFFLINE] No se pudo obtener ${request.url}: ${error.message}`);
          // Si es navegación, mostrar offline.html
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return Response.error();
        });
    })
  );
});

// 4. Manejo de mensajes (actualización inmediata)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] Recibido mensaje SKIP_WAITING. Activando nueva versión...');
    self.skipWaiting();
  }
});
