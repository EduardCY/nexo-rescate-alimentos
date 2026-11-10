/**
 * Service Worker PWA - Nexo Rescate de Alimentos Cali (TASK-28 / RNF-002 / CA-PWA.2 / CA-PWA.3)
 *
 * Estrategias diferenciadas de caché:
 * 1. Pre-cache seguro del App Shell en `install` (verificando `!response.redirected` para evitar respuestas redireccionadas en caché).
 * 2. Cache-First para activos estáticos inmutables (`/_next/static/*`, `/icons/*`, `.png`, `.svg`, `.woff2`, `.css`).
 * 3. Network-First con desinfección de bandera `redirected` para navegaciones HTML (`request.mode === 'navigate'`) y degradación a caché local o `/~offline`.
 * 4. Network-First para consultas dinámicas.
 */

const CACHE_NAME = 'nexo-pwa-v5';

const APP_SHELL_ROUTES = [
  '/login',
  '/~offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
];

/**
 * Reconstruye una respuesta eliminando la bandera `redirected: true` cuando sea necesario.
 * En Chromium, devolver una Response con `redirected === true` a una petición cuyo `redirect`
 * mode no es `'follow'` (como toda navegación `request.mode === 'navigate'`) provoca `ERR_FAILED`.
 */
async function desinfectarRespuestaNavegacion(response) {
  if (!response || !response.redirected) {
    return response;
  }
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        for (const asset of APP_SHELL_ROUTES) {
          try {
            const response = await fetch(asset, { cache: 'reload' });
            if (response && response.status === 200 && !response.redirected) {
              await cache.put(asset, response);
            }
          } catch {
            // Continuar pre-cacheo incluso si una ruta opcional no está disponible
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
  // Solo interceptar activos del mismo origen para no interferir con tiles cartográficos
  if (url.origin !== self.location.origin) {
    return false;
  }
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
  // Permitir que tiles de mapas (CartoDB, OpenStreetMap) fluyan de forma nativa por red y caché HTTP del navegador
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('openstreetmap.org')) return;

  // 1. Estrategia Cache-First para activos estáticos
  if (esActivoEstatico(url, request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached && !cached.redirected) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200 && !response.redirected) {
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

  // 2. Estrategia Network-First con protección anti-redirected para navegaciones HTML (CA-PWA.2 / CA-PWA.3)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetch(request);

          if (networkResponse && networkResponse.type === 'opaqueredirect') {
            return networkResponse;
          }

          if (networkResponse && networkResponse.status === 200) {
            const cleanResponse = await desinfectarRespuestaNavegacion(networkResponse);
            if (!networkResponse.redirected) {
              await cache.put(request, cleanResponse.clone());
            }
            return cleanResponse;
          }

          if (networkResponse) {
            return await desinfectarRespuestaNavegacion(networkResponse);
          }
        } catch {
          // Sin conexión a red: degradar a caché local o página /~offline
        }

        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return await desinfectarRespuestaNavegacion(cachedResponse);
        }

        const offlineFallback = await cache.match('/~offline');
        if (offlineFallback) {
          return await desinfectarRespuestaNavegacion(offlineFallback);
        }

        const loginFallback = await cache.match('/login');
        if (loginFallback) {
          return await desinfectarRespuestaNavegacion(loginFallback);
        }

        return Response.error();
      })()
    );
    return;
  }

  // 3. Estrategia Network-First para datos y rutas restantes
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return await desinfectarRespuestaNavegacion(cached);
        const offline = await caches.match('/~offline');
        if (offline) return await desinfectarRespuestaNavegacion(offline);
        return Response.error();
      })
  );
});
