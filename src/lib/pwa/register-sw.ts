import {
  sincronizarColaOffline,
  sincronizarCatalogoDelta,
} from '@/lib/sync/offline-sync';
import { sembrarCatalogoProductosOffline } from '@/lib/db';

/**
 * Registra el Service Worker (`/sw.js`) y vincula los eventos de reconexión (`online`)
 * con el motor de sincronización local Outbox y Delta Sync (`TASK-28` / `RNF-002`).
 *
 * ¿Por qué?: Garantiza que la PWA pueda abrirse sin red en sótanos y galerías de mercado
 * (CA-PWA.2) y que al recuperar cobertura 4G/Wi-Fi despache automáticamente las mutaciones
 * pendientes en IndexedDB (CA-01.5 / CA-PWA.4).
 */
export function registrarServiceWorkerPWA(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Sembrar catálogo base offline de forma idempotente y sincronizar delta si hay red
  void sembrarCatalogoProductosOffline().catch(() => undefined);
  if (navigator.onLine) {
    void sincronizarCatalogoDelta().catch(() => undefined);
    void sincronizarColaOffline().catch(() => undefined);
  }

  const handleLoad = () => {
    if ('caches' in window) {
      void window.caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((name) => name !== 'nexo-pwa-v4')
              .map((name) => window.caches.delete(name))
          )
        )
        .catch(() => undefined);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          void reg.update();
        })
        .catch(() => {
          // Silencioso en entornos de desarrollo sin HTTPS
        });
    }
  };

  const handleOnline = () => {
    void sincronizarColaOffline().catch(() => undefined);
    void sincronizarCatalogoDelta().catch(() => undefined);
  };

  if (document.readyState === 'complete') {
    handleLoad();
  } else {
    window.addEventListener('load', handleLoad);
  }
  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('load', handleLoad);
    window.removeEventListener('online', handleOnline);
  };
}
