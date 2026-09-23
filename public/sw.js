/**
 * Service Worker — EL MERENGÓN POS
 * ──────────────────────────────────────────────────────────────────────────────
 * Estrategia:
 *   • index.html / navegación de páginas: Network First
 *     → Siempre se pide la versión más nueva primero; si no hay red, se cae al
 *     caché. Es CRÍTICO que el shell (index.html) nunca quede "cache-first": cada
 *     deploy de Vite genera archivos JS/CSS con un hash nuevo en el nombre, y un
 *     index.html viejo en caché sigue apuntando a hashes que el deploy siguiente
 *     ya borró — el navegador pedía un .js que ya no existía, Vercel devolvía el
 *     index.html (por el rewrite de SPA) en su lugar, y el módulo fallaba con
 *     "Expected a JavaScript-or-Wasm module script" dejando la pantalla en blanco
 *     hasta que alguien borraba el caché a mano. Bug real, reproducido en prod.
 *   • JS/CSS/imágenes con hash de contenido (/assets/*): Cache First
 *     → Son inmutables por versión (el hash cambia si el contenido cambia), así
 *     que cachearlos agresivamente es seguro y da carga instantánea offline.
 *   • Llamadas a /api/*: Network Only (nunca se cachean datos dinámicos).
 *
 * Para forzar que TODOS los dispositivos limpien su caché vieja de una vez,
 * incrementar CACHE_VERSION (no hace falta para las actualizaciones normales:
 * la estrategia network-first del shell ya evita quedar con HTML viejo).
 * ──────────────────────────────────────────────────────────────────────────────
 */

const CACHE_VERSION = 'v6';
const CACHE_NAME = `merengon-pos-${CACHE_VERSION}`;

// Recursos que se precargan al instalar el SW (app shell mínima)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-maskable.png',
  '/favicon.png',
  '/favicon.ico',
];

// ─── Instalación: precachear el app shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activar de inmediato sin esperar tab anterior
  );
});

// ─── Activación: eliminar cachés de versiones anteriores ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // tomar control de todos los tabs abiertos
  );
});

// ─── Fetch: Cache First para estáticos, Network Only para API ─────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Solo manejar peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // 2. Peticiones a /api/* → siempre red, nunca caché
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si la API falla offline, devolver un error JSON claro
        return new Response(
          JSON.stringify({ error: 'Sin conexión. Los datos se sincronizarán cuando vuelva el internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 3. Solo manejar peticiones GET para el resto
  if (event.request.method !== 'GET') return;

  // 4. El SHELL (navegación de páginas / index.html): Network First.
  //    Nunca "cache-first" acá — ver la explicación arriba de CACHE_VERSION.
  const isShellRequest =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if (isShellRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // 5. Assets con hash de contenido y demás estáticos: Cache First con
  //    actualización en background (son inmutables por versión, no hay riesgo
  //    de quedar sirviendo algo desactualizado bajo un mismo nombre de archivo).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {}); // silenciar errores de red — ya tenemos el caché

        // Devolver el caché de inmediato (no esperamos la red)
        void fetchPromise;
        return cached;
      }

      // Si no hay caché, ir a la red y guardar el resultado
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.ok &&
            (url.pathname.startsWith('/assets/') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.ico') ||
              url.pathname.endsWith('.json'))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => new Response('', { status: 408 }));
    })
  );
});
