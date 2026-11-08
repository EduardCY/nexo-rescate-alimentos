/**
 * Service Worker PWA - Nexo Rescate de Alimentos Cali (TASK-28 / RNF-002 / CA-PWA.2 / CA-PWA.3)
 *
 * Estrategias diferenciadas de caché:
 * 1. Pre-cache del App Shell en `install`: '/', '/donaciones', '/rastreo', '/~offline', '/manifest.json'.
 * 2. Cache-First para activos estáticos inmutables (`/_next/static/*`, `/icons/*`, `.png`, `.svg`, `.woff2`, `.css`).
 * 3. Stale-While-Revalidate para navegaciones HTML (`request.mode === 'navigate'`) con degradación a `/~offline`.
 * 4. Network-First para consultas dinámicas.
 */

const CACHE_NAME = 'nexo-pwa-v2';

const APP_SHELL_ROUTES = [
  '/',
  '/donaciones',
  '/rastreo',
  '/~offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        for (const asset of APP_SHELL_ROUTES) {
          try {
            await cache.add(asset);
          } catch {
            // Continuar pre-cacheo incluso si una ruta opcional aún no está compilada
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function esActivoEstatico(url, request) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.css') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('supabase.co')) return;

  // 1. Estrategia Cache-First para activos estáticos
  if (esActivoEstatico(url, request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match('/~offline'));
      })
    );
    return;
  }

  // 2. Estrategia Stale-While-Revalidate para navegaciones HTML con fallback a /~offline (CA-PWA.2 / CA-PWA.3)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        if (cachedResponse) {
          void networkFetch;
          return cachedResponse;
        }

        const liveResponse = await networkFetch;
        if (liveResponse) return liveResponse;

        const offlineFallback = await cache.match('/~offline');
        if (offlineFallback) return offlineFallback;

        return (await cache.match('/')) || Response.error();
      })
    );
    return;
  }

  // 3. Estrategia Network-First para datos y rutas restantes
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match('/~offline')) || Response.error();
      })
  );
});
