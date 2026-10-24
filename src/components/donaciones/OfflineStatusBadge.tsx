'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { obtenerDonacionesPendientes, type DonacionOffline } from '@/lib/db';

/**
 * Banner flotante e indicador reactivo de conectividad (TASK-07 / RNF-002).
 * Diseñado bajo la identidad visual Windows 98 / SCADA del proyecto.
 *
 * ¿Por qué?: En plazas de mercado como Cavasa y Santa Elena la señal celular es inestable;
 * este componente informa visualmente al comerciante cuando el sistema opera en modo local
 * IndexedDB (Dexie.js) y cuántas donaciones están pendientes de sincronización.
 */
export function OfflineStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendientes, setPendientes] = useState<DonacionOffline[]>([]);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const verificarColaLocal = async () => {
      try {
        const items = await obtenerDonacionesPendientes();
        setPendientes(items);
      } catch {
        // Ignorar en SSR o entornos sin IndexedDB
      }
    };

    verificarColaLocal();

    const handleOnline = () => {
      setIsOnline(true);
      verificarColaLocal();
    };

    const handleOffline = () => {
      setIsOnline(false);
      verificarColaLocal();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const interval = setInterval(verificarColaLocal, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs" role="status" aria-live="polite">
      {isOnline ? (
        <div className="bevel-in bg-[#e0ffd8] text-green-950 px-2.5 py-1 font-bold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          <Wifi className="w-3.5 h-3.5 text-green-800" />
          <span>EN LÍNEA · SUPABASE ACTIVO</span>
        </div>
      ) : (
        <div className="bevel-in bg-[#fff4cc] text-amber-950 px-2.5 py-1 font-bold flex items-center gap-1.5 border border-amber-600">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <WifiOff className="w-3.5 h-3.5 text-amber-800" />
          <span>MODO OFFLINE — Guardado local en IndexedDB</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div
          className="bevel-in bg-[#ffdddd] text-red-950 px-2 py-1 font-bold flex items-center gap-1"
          title="Donaciones almacenadas localmente pendientes de sincronizar"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-red-800" />
          <span>[{pendientes.length} pend. de sincronización]</span>
        </div>
      )}
    </div>
  );
}

export default OfflineStatusBadge;
