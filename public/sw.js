/**
 * Service Worker — EL MERENGÓN POS
 * Estrategia: Cache First para recursos estáticos (HTML, JS, CSS, imágenes).
 * Las llamadas a /api/* siempre van a la red (nunca se cachean).
 *
 * Esto garantiza que el POS cargue INSTANTÁNEAMENTE aunque no haya internet,
 * usando la última versión cacheada del app.
 */

const CACHE_NAME = 'merengon-pos-v1';

// Recursos que se precargan al instalar el SW
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ─── Instalación: precachear recursos principales ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activar inmediatamente sin esperar a que el tab anterior cierre
  self.skipWaiting();
});

// ─── Activación: limpiar caches viejas ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Tomar control de todos los tabs abiertos
  self.clients.claim();
});

// ─── Fetch: Cache First para estáticos, Network Only para API ─────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Las llamadas a /api/* SIEMPRE van a la red — nunca cachear datos dinámicos
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;

  // Cache First: devolver desde caché si existe, sino ir a la red y cachear
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((networkResponse) => {
        // Solo cachear respuestas exitosas de recursos estáticos
        if (
          networkResponse.ok &&
          (url.pathname.startsWith('/assets/') || url.pathname === '/' || url.pathname.endsWith('.html'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Si falla la red y no hay caché, devolver index.html para que React Router maneje
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
