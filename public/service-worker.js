// service-worker.js
const APP_VERSION = '1.0.0';
const CACHE_NAME = `thomasparking-${APP_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  OFFLINE_URL
];

// ==================== INSTALACIÓN ====================
self.addEventListener('install', (event) => {
  console.log(`[SW v${APP_VERSION}] Evento: install`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW] Iniciando precaché de ${PRECACHE_ASSETS.length} recursos...`);
        
        return Promise.all(
          PRECACHE_ASSETS.map(url => {
            return fetch(url)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status} - ${url}`);
                }
                
                console.log(`[SW] ✔️ Cacheado: ${url}`);
                return cache.put(url, response);
              })
              .catch(error => {
                console.error(`[SW] ❌ Error cacheando ${url}: ${error.message}`);
                // Continuar con otros recursos aunque falle uno
              });
          })
        );
      })
      .then(() => {
        console.log('[SW] Precaché completado. Saltando espera...');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error crítico durante instalación:', error);
        throw error;
      })
  );
});

// ==================== ACTIVACIÓN ====================
self.addEventListener('activate', (event) => {
  console.log(`[SW v${APP_VERSION}] Evento: activate`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      console.log(`[SW] Cachés antiguos encontrados: ${oldCaches.join(', ')}`);
      
      return Promise.all(
        oldCaches.map(name => {
          console.log(`[SW] 🗑️ Eliminando caché: ${name}`);
          return caches.delete(name);
        })
      );
    })
    .then(() => {
      console.log('[SW] ♻️  Tomando control de los clientes...');
      return self.clients.claim();
    })
  );
});

// ==================== ESTRATEGIA FETCH ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  console.log(`[SW] 🔄 Fetch: ${request.url}`);
  
  // Ignorar solicitudes no HTTP y métodos no GET
  if (!url.protocol.startsWith('http') || request.method !== 'GET') {
    console.log(`[SW] ⚠️  Ignorando solicitud no cacheable: ${request.url}`);
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // 1. Intentar servir desde caché
      if (cachedResponse) {
        console.log(`[SW] 🗄️  Sirviendo desde caché: ${request.url}`);
        return cachedResponse;
      }
      
      // 2. Si no está en caché, hacer fetch y cachear
      return fetch(request)
        .then(networkResponse => {
          // Verificar respuesta válida para cachear
          if (!networkResponse.ok || networkResponse.type === 'opaque') {
            console.log(`[SW] ⚠️  Respuesta no cacheable: ${request.url}`);
            return networkResponse;
          }
          
          // Clonar ANTES de usar la respuesta
          const responseToCache = networkResponse.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
              console.log(`[SW] 💾 Guardado en caché: ${request.url}`);
            })
            .catch(error => {
              console.error(`[SW] ❌ Error guardando en caché: ${request.url}`, error);
            });
          
          return networkResponse;
        })
        .catch(async error => {
          // 3. Manejo de errores de red
          console.error(`[SW] 🌐 Error de red: ${request.url} - ${error.message}`);
          
          // Fallback para navegación
          if (request.mode === 'navigate') {
            console.log('[SW] 🚧 Sirviendo página offline');
            return caches.match(OFFLINE_URL);
          }
          
          // Intentar devolver versión obsoleta si existe
          const staleResponse = await caches.match(request);
          return staleResponse || Response.error();
        });
    })
  );
});

// ==================== MANEJO DE ACTUALIZACIONES ====================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] ⚡ Recibido SKIP_WAITING - Activando nueva versión');
    self.skipWaiting();
  }
});
