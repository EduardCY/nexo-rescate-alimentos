/**
 * Service Worker - Nexo Rescate de Alimentos Cali
 * Estrategias de caché:
 * - Cache First: Activos estáticos (imágenes, fuentes, estilos, manifest).
 * - Network First con degradación graceful: Páginas y navegación.
 * - Network Only: Llamadas API externas (Supabase) para evitar respuestas desactualizadas.
 */

const CACHE_NAME = 'nexo-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
];

// Evento de instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Evento de activación: limpieza de cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Evento de intercepción de red (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar esquemas que no sean http/https (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Ignorar llamadas a Supabase API y WebSockets (deben ser siempre en red viva)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Para peticiones de navegación (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('/');
        });
      })
    );
    return;
  }

  // Para activos estáticos locales (imágenes, scripts, fuentes)
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Devolver de caché y revalidar en segundo plano (Stale While Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Por defecto: Red primero
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
