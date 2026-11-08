'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Database } from 'lucide-react';
import { contarPendientesTotales, obtenerDonacionesPendientes, type DonacionOffline } from '@/lib/db';
import { sincronizarColaOffline } from '@/lib/sync/offline-sync';
import { OutboxInspectorModal } from '@/components/nexo/OutboxInspectorModal';

/**
 * Banner e indicador reactivo de conectividad con acceso al Inspector Outbox (`TASK-30` / `CA-01.5` / `CA-PWA.4`).
 *
 * ¿Por qué?: En plazas de mercado como Cavasa y Santa Elena la señal celular es inestable;
 * este componente informa visualmente al comerciante cuando el sistema opera en modo local
 * IndexedDB (Dexie.js), permite abrir el Inspector Visual de Cola Offline y sincroniza
 * automáticamente las donaciones encoladas al recuperar conexión.
 */
export function OfflineStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendientes, setPendientes] = useState<DonacionOffline[]>([]);
  const [totalOutbox, setTotalOutbox] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [inspectorAbierto, setInspectorAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const timeoutMensajeRef = useRef<NodeJS.Timeout | null>(null);

  const refrescarCola = useCallback(async () => {
    try {
      const [items, total] = await Promise.all([
        obtenerDonacionesPendientes(),
        contarPendientesTotales(),
      ]);
      setPendientes(items);
      setTotalOutbox(total);
    } catch {
      // Ignorar en entornos sin IndexedDB
    }
  }, []);

  const ejecutarSincronizacion = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setSincronizando(true);
    try {
      const res = await sincronizarColaOffline();
      if (res.sincronizadas > 0) {
        const codigosStr = res.codigos.join(', ');
        setMensajeExito(`✓ ${res.sincronizadas} donación(es) sincronizada(s): ${codigosStr}`);
        if (timeoutMensajeRef.current) clearTimeout(timeoutMensajeRef.current);
        timeoutMensajeRef.current = setTimeout(() => setMensajeExito(null), 6000);
      }
    } finally {
      await refrescarCola();
      setSincronizando(false);
    }
  }, [refrescarCola]);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    void refrescarCola();

    const t0 = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        void ejecutarSincronizacion();
      }
    }, 400);

    const handleOnline = () => {
      setIsOnline(true);
      void ejecutarSincronizacion();
      setTimeout(() => {
        void ejecutarSincronizacion();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      void refrescarCola();
    };

    const handleQueueChanged = () => {
      void refrescarCola();
    };

    const handleItemSynced = (e: Event) => {
      const custom = e as CustomEvent<{ localId: number; codigoServidor: string }>;
      if (custom.detail?.codigoServidor) {
        setMensajeExito(`✓ Sincronizado: ${custom.detail.codigoServidor}`);
        if (timeoutMensajeRef.current) clearTimeout(timeoutMensajeRef.current);
        timeoutMensajeRef.current = setTimeout(() => setMensajeExito(null), 5000);
      }
      void refrescarCola();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nexo:offline-queue-changed', handleQueueChanged);
    window.addEventListener('nexo:offline-synced', handleItemSynced);
    window.addEventListener('nexo:outbox-synced', handleQueueChanged);

    const interval = setInterval(refrescarCola, 6000);

    return () => {
      clearTimeout(t0);
      if (timeoutMensajeRef.current) clearTimeout(timeoutMensajeRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nexo:offline-queue-changed', handleQueueChanged);
      window.removeEventListener('nexo:offline-synced', handleItemSynced);
      window.removeEventListener('nexo:outbox-synced', handleQueueChanged);
      clearInterval(interval);
    };
  }, [ejecutarSincronizacion, refrescarCola]);

  const cantidadPendiente = Math.max(pendientes.length, totalOutbox);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs" role="status" aria-live="polite">
        {isOnline ? (
          <div className="bevel-in bg-[#e0ffd8] text-green-950 px-2.5 py-1 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            <Wifi className="w-3.5 h-3.5 text-green-800" />
            <span>CONEXIÓN ACTIVA</span>
          </div>
        ) : (
          <div className="bevel-in bg-[#fff4cc] text-amber-950 px-2.5 py-1 font-bold flex items-center gap-1.5 border border-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
            <WifiOff className="w-3.5 h-3.5 text-amber-800" />
            <span>SIN INTERNET — Modo local (IndexedDB)</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setInspectorAbierto(true)}
          className="btn-98 !py-1 !px-2 text-[11px] font-bold flex items-center gap-1 text-[#000080]"
          title="Abrir Inspector Visual de Cola Offline (Outbox)"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Cola Offline ({cantidadPendiente})</span>
        </button>

        {cantidadPendiente > 0 && (
          <button
            type="button"
            onClick={() => void ejecutarSincronizacion()}
            disabled={sincronizando || !isOnline}
            className={`bevel-out px-2 py-1 font-bold flex items-center gap-1 text-[11px] ${
              isOnline
                ? 'bg-[#ffdddd] hover:bg-[#ffcccc] text-red-950 cursor-pointer active:bevel-in'
                : 'bg-[#eeeeee] text-slate-600 cursor-not-allowed opacity-80'
            }`}
            title={isOnline ? 'Hacer clic para sincronizar ahora con el servidor' : 'Esperando recuperación de red'}
          >
            <RefreshCw className={`w-3 h-3 text-red-800 ${sincronizando ? 'animate-spin' : ''}`} />
            <span>[{cantidadPendiente} por sincronizar]</span>
          </button>
        )}

        {mensajeExito && (
          <div className="bevel-in bg-[#dcfce7] text-emerald-950 border border-emerald-600 px-2.5 py-1 font-bold flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}
      </div>

      <OutboxInspectorModal
        abierto={inspectorAbierto}
        onCerrar={() => setInspectorAbierto(false)}
      />
    </>
  );
}

export default OfflineStatusBadge;
