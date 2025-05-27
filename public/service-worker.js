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
  OFFLINE_URL,
  '/static/js/bundle.js',
  '/static/css/main.css'
];

// 1. Instalación: Precaché de recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Error durante la precaché:', error);
      })
  );
});

// 2. Activación: Limpieza de cachés antiguos y claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategias de caché inteligentes
const CACHE_STRATEGIES = {
  static: {
    match: ({ url }) => 
      url.pathname.startsWith('/static/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.webmanifest'),
    handler: 'CacheFirst'
  },
  api: {
    match: ({ url }) => url.pathname.startsWith('/api/'),
    handler: 'NetworkFirst',
    options: {
      networkTimeout: 3000
    }
  },
  navigation: {
    match: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkFirst'
  }
};

// 4. Manejador principal de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes no HTTP y métodos no GET
  if (!url.protocol.startsWith('http') || request.method !== 'GET') return;

  // Determinar estrategia de caché
  const { handler, options } = getCacheStrategy(request);
  
  event.respondWith(
    handler === 'CacheFirst' 
      ? handleCacheFirst(event, options)
      : handler === 'NetworkFirst'
      ? handleNetworkFirst(event, options)
      : handleStaleWhileRevalidate(event, options)
  );
});

// 5. Implementación de estrategias
async function handleCacheFirst(event, options) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(event.request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(event.request, networkResponse.clone());
  return networkResponse;
}

async function handleNetworkFirst(event, options) {
  try {
    const networkResponse = await fetchWithTimeout(event.request, options?.networkTimeout);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;
    
    if (event.request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    return Response.error();
  }
}

async function handleStaleWhileRevalidate(event) {
  const cachedResponse = await caches.match(event.request);
  const fetchPromise = fetch(event.request)
    .then(networkResponse => {
      caches.open(CACHE_NAME)
        .then(cache => cache.put(event.request, networkResponse.clone()));
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// 6. Utilidades
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  for (const strategy of Object.values(CACHE_STRATEGIES)) {
    if (strategy.match({ request, url })) {
      return strategy;
    }
  }
  return { handler: 'NetworkFirst' };
}

function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}

// 7. Manejo de actualizaciones
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
