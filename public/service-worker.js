import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. Precaché automático generado por Vite
precacheAndRoute(self.__WB_MANIFEST);

// 2. Configuración base
const APP_VERSION = '1.0.0';
const CACHE_NAME = `thomasparking-${APP_VERSION}`;
const OFFLINE_URL = '/offline.html';
const API_TIMEOUT = 5000; // 5 segundos
const MAX_AGE_DAYS = 30;

// 3. Estrategias de caché personalizadas
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-pages`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: MAX_AGE_DAYS * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === 'script' || 
                   request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: `${CACHE_NAME}-assets`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: MAX_AGE_DAYS * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: `${CACHE_NAME}-api`,
    networkTimeoutSeconds: API_TIMEOUT / 1000,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: MAX_AGE_DAYS * 24 * 60 * 60,
      }),
    ],
  })
);

// 4. CacheFirst para TODOS los demás recursos
registerRoute(
  ({ request, url }) => {
    // Excluir APIs y documentos principales
    return !url.pathname.startsWith('/api') &&
           request.destination !== 'document' &&
           request.destination !== 'script' &&
           request.destination !== 'style';
  },
  new CacheFirst({
    cacheName: `${CACHE_NAME}-other`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: MAX_AGE_DAYS * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// 5. Manejo offline para navegación
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(OFFLINE_URL) || Response.error();
      })
    );
  }
});

// 6. Actualizaciones automáticas
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] ⚡ Activando nueva versión inmediatamente');
    self.skipWaiting();
    self.clients.claim();
  }
});

// 7. Limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && !name.includes(CACHE_NAME))
          .map(name => {
            console.log(`[SW] 🗑️ Eliminando caché obsoleto: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
});

// 8. Logs para depuración
self.addEventListener('install', (event) => {
  console.log(`[SW v${APP_VERSION}] 🛠️ Instalado`);
  event.waitUntil(self.skipWaiting());
});
