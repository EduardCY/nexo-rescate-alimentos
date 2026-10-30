'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import {
  obtenerDonacionesPendientes,
  marcarDonacionSincronizada,
  type DonacionOffline,
} from '@/lib/db';
import { publicarDonacion } from '@/actions/donaciones';

/**
 * Banner flotante e indicador reactivo de conectividad con sincronización automática (CA-01.5 / RNF-002).
 * Diseñado bajo la identidad visual Windows 98 / SCADA del proyecto.
 *
 * ¿Por qué?: En plazas de mercado como Cavasa y Santa Elena la señal celular es inestable;
 * este componente informa visualmente al comerciante cuando el sistema opera en modo local
 * IndexedDB (Dexie.js) y sincroniza automáticamente las donaciones encoladas al recuperar conexión.
 */
export function OfflineStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendientes, setPendientes] = useState<DonacionOffline[]>([]);
  const sincronizandoRef = useRef(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const sincronizarColaPendiente = async () => {
      if (sincronizandoRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      try {
        const items = await obtenerDonacionesPendientes();
        setPendientes(items);
        if (items.length === 0) return;

        sincronizandoRef.current = true;
        for (const item of items) {
          if (!item.exencionSanitariaAceptada) continue;
          try {
            const res = await publicarDonacion({
              tipoAlimento: item.tipoAlimento,
              cantidadEstimada: item.cantidadEstimada,
              unidadMedida: (item.unidadMedida as 'kg' | 'canastillas' | 'bultos' | 'unidades') || 'kg',
              direccionRecogida: item.direccionRecogida,
              horaLimite: item.horaLimite,
              requiereFrio: item.requiereFrio,
              exencionSanitariaAceptada: true,
              donanteId: item.donanteId,
              donanteNombre: item.donanteNombre,
            });
            if (res.exito && item.id !== undefined) {
              await marcarDonacionSincronizada(item.id, res.codigo);
            }
          } catch {
            // Si falla una petición individual, permanece en PENDIENTE para el siguiente ciclo
          }
        }
        const restantes = await obtenerDonacionesPendientes();
        setPendientes(restantes);
      } catch {
        // Ignorar en SSR o entornos sin IndexedDB
      } finally {
        sincronizandoRef.current = false;
      }
    };

    const verificarColaLocal = async () => {
      try {
        const items = await obtenerDonacionesPendientes();
        setPendientes(items);
        if (items.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
          await sincronizarColaPendiente();
        }
      } catch {
        // Ignorar en SSR o entornos sin IndexedDB
      }
    };

    verificarColaLocal();

    const handleOnline = () => {
      setIsOnline(true);
      void sincronizarColaPendiente();
    };

    const handleOffline = () => {
      setIsOnline(false);
      void verificarColaLocal();
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
          <span>CONEXIÓN A INTERNET ACTIVA</span>
        </div>
      ) : (
        <div className="bevel-in bg-[#fff4cc] text-amber-950 px-2.5 py-1 font-bold flex items-center gap-1.5 border border-amber-600">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <WifiOff className="w-3.5 h-3.5 text-amber-800" />
          <span>SIN INTERNET — Guardando en tu teléfono</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div
          className="bevel-in bg-[#ffdddd] text-red-950 px-2 py-1 font-bold flex items-center gap-1"
          title="Donaciones almacenadas localmente pendientes de sincronizar"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-red-800" />
          <span>[{pendientes.length} donaciones por sincronizar]</span>
        </div>
      )}
    </div>
  );
}

export default OfflineStatusBadge;
