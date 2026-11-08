'use client';

import { useEffect } from 'react';
import { registrarServiceWorkerPWA } from '@/lib/pwa/register-sw';

/**
 * Componente cliente para registrar el Service Worker de la PWA y activar
 * la sincronización reactiva Outbox/Delta en el ciclo de vida del navegador (`TASK-28`).
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    return registrarServiceWorkerPWA();
  }, []);

  return null;
}
