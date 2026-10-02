// Service Worker para 'El Maravilloso Ciclo de la Planta'
const CACHE_NAME = 'ciclo-planta-v2';

// Archivos nucleares garantizados
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Archivos de imagen y fuentes (se guardan individualmente sin romper la instalación si alguno no existe)
const OPTIONAL_ASSETS = [
  './icono.png',
  './logofirma.png',
  './logofirma.jpg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700;800&display=swap'
];

// Instalación: Carga tolerante a fallos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Guardar archivos base indispensables
      await cache.addAll(CORE_ASSETS);
      
      // 2. Intentar guardar recursos opcionales uno por uno sin abortar en caso de 404
      await Promise.allSettled(
        OPTIONAL_ASSETS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// Activación: limpieza de versiones viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Manejo de peticiones: Red primero con respaldo a caché offline
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
