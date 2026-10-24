'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { obtenerDonacionesPendientes, type DonacionOffline } from '@/lib/db';

/**
 * Componente reactivo que monitorea el estado de conectividad celular y la cola local de Dexie.
 * 
 * ¿Por qué?: En plazas de mercado con conectividad intermitente (RNF-002), el comerciante
 * debe tener visibilidad inmediata y tranquilidad de que sus registros no se pierden y se
 * enviarán automáticamente al recuperar señal 4G/WiFi.
 */
export function OfflineStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendientes, setPendientes] = useState<DonacionOffline[]>([]);

  useEffect(() => {
    // Inicializar estado de red del navegador
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const checkPendientes = async () => {
      try {
        const items = await obtenerDonacionesPendientes();
        setPendientes(items);
      } catch {
        // En entornos sin IndexedDB o SSR se omite silenciosamente
      }
    };

    checkPendientes();

    const handleOnline = () => {
      setIsOnline(true);
      checkPendientes();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkPendientes();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Revisión periódica de registros pendientes
    const interval = setInterval(checkPendientes, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      {isOnline ? (
        <div 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">En línea · Sincronizado</span>
          <span className="sm:hidden">Online</span>
        </div>
      ) : (
        <div 
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline (Plaza)</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div 
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30"
          title={`${pendientes.length} donación(es) almacenada(s) localmente pendientes de subir al servidor`}
        >
          <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
          <span>{pendientes.length} pend.</span>
        </div>
      )}
    </div>
  );
}
