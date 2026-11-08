'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SesionUsuarioActiva } from '@/actions/organizaciones';
import {
  guardarSesionRBACOffline,
  revocarSesionRBACOffline,
} from '@/lib/auth/offline-session';

const STORAGE_KEY = 'nexo_sesion_activa_v2';

export interface SessionContextValue {
  sesion: SesionUsuarioActiva | null;
  cargandoSesion: boolean;
  establecerSesion: (nueva: SesionUsuarioActiva) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  sesion: null,
  cargandoSesion: true,
  establecerSesion: async () => {},
  cerrarSesion: async () => {},
});

function sincronizarCookiesNavegador(sesion: SesionUsuarioActiva | null) {
  if (typeof document === 'undefined') return;
  if (!sesion) {
    document.cookie = 'nexo_rol=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'nexo_user_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'nexo_estado_cuenta=; path=/; max-age=0; SameSite=Lax';
    return;
  }
  const ttlSegundos = 24 * 60 * 60;
  const userIdSeguro = sesion.userId || sesion.id || '';
  const estadoSeguro = sesion.estadoCuenta || 'ACTIVO';
  document.cookie = `nexo_rol=${encodeURIComponent(sesion.rol)}; path=/; max-age=${ttlSegundos}; SameSite=Lax`;
  document.cookie = `nexo_user_id=${encodeURIComponent(userIdSeguro)}; path=/; max-age=${ttlSegundos}; SameSite=Lax`;
  document.cookie = `nexo_estado_cuenta=${encodeURIComponent(estadoSeguro)}; path=/; max-age=${ttlSegundos}; SameSite=Lax`;
}

/**
 * Proveedor de sesión RBAC en cliente con sincronización en localStorage, cookies de borde
 * y almacén IndexedDB firmado con HMAC-SHA256 (`NexoSesionRBAC`).
 *
 * ¿Por qué?: Garantiza que los 5 portales por rol operen con identidad explícita tanto en línea
 * como durante desconexiones en galerías de mercado (CA-05.1, CA-05.2, CA-05.3).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesionState] = useState<SesionUsuarioActiva | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as SesionUsuarioActiva;
        if (parsed && parsed.userId && parsed.rol) {
          setSesionState(parsed);
          sincronizarCookiesNavegador(parsed);
        }
      }
    } catch {
      // Ignorar errores de parseo en localStorage
    } finally {
      setCargandoSesion(false);
    }
  }, []);

  const establecerSesion = useCallback(async (nueva: SesionUsuarioActiva) => {
    setSesionState(nueva);
    sincronizarCookiesNavegador(nueva);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nueva));
      } catch {
        // Ignorar cuota excedida
      }
    }

    try {
      await guardarSesionRBACOffline({
        userId: nueva.userId || nueva.id,
        rol: nueva.rol,
        estadoCuenta: nueva.estadoCuenta,
      });
    } catch {
      // En entornos sin Web Crypto o UUID no estándar, la sesión en memoria/cookie sigue activa
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    setSesionState(null);
    sincronizarCookiesNavegador(null);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignorar
      }
    }

    try {
      await revocarSesionRBACOffline();
    } catch {
      // Ignorar
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sesion,
        cargandoSesion,
        establecerSesion,
        cerrarSesion,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook para consumir la sesión activa del usuario y su rol corporativo.
 */
export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
