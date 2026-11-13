'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  RotateCcw,
} from 'lucide-react';
import {
  db,
  listarOutbox,
  reintentarMutacion,
  type DonacionOffline,
  type OutboxMutation,
} from '@/lib/db';
import { sincronizarColaOffline } from '@/lib/sync/offline-sync';

export interface OutboxInspectorModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Inspector Visual de Cola Offline y Patrón Outbox (`TASK-30` / `CA-PWA.4` / `CA-01.5`).
 *
 * ¿Por qué?: Permite a comerciantes y voluntarios en galerías de mercado auditar las donaciones
 * y mutaciones almacenadas en IndexedDB (`donaciones_offline` y `outbox_mutations`), verificar
 * su código determinista `OFFLINE-DON-...`, revisar errores de red y forzar la sincronización.
 */
export function OutboxInspectorModal({ abierto, onCerrar }: OutboxInspectorModalProps) {
  const [donacionesLocales, setDonacionesLocales] = useState<DonacionOffline[]>([]);
  const [mutaciones, setMutaciones] = useState<OutboxMutation[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensajeSync, setMensajeSync] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [dons, muts] = await Promise.all([
        db.donaciones.toArray(),
        listarOutbox(),
      ]);
      setDonacionesLocales(dons.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
      setMutaciones(muts);
    } catch {
      // Ignorar en SSR
    }
  }, []);

  useEffect(() => {
    if (!abierto) return;
    void cargarDatos();

    const listener = () => {
      void cargarDatos();
    };
    window.addEventListener('nexo:offline-queue-changed', listener);
    window.addEventListener('nexo:offline-synced', listener);
    window.addEventListener('nexo:outbox-synced', listener);

    return () => {
      window.removeEventListener('nexo:offline-queue-changed', listener);
      window.removeEventListener('nexo:offline-synced', listener);
      window.removeEventListener('nexo:outbox-synced', listener);
    };
  }, [abierto, cargarDatos]);

  if (!abierto) return null;

  const handleSincronizarAhora = async () => {
    setSincronizando(true);
    setMensajeSync(null);
    try {
      const res = await sincronizarColaOffline();
      setMensajeSync(
        res.sincronizadas > 0
          ? `Sincronización completada: ${res.sincronizadas} registro(s) enviados (${res.codigos.join(', ')}).`
          : 'Cola verificada. No hubo elementos nuevos sincronizados en este intento.'
      );
      await cargarDatos();
    } finally {
      setSincronizando(false);
    }
  };

  const handleReintentarMutacion = async (id?: number) => {
    if (id === undefined) return;
    await reintentarMutacion(id);
    await cargarDatos();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await handleSincronizarAhora();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-outbox-inspector"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
    >
      <div className="bevel-out w-full max-w-3xl bg-[#d4d0c8] p-[3px] text-black shadow-[8px_8px_0_rgba(0,0,0,0.75)] font-mono">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex items-center justify-between gap-2 px-3 py-1.5 text-white">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
            <h2 id="titulo-outbox-inspector" className="text-xs sm:text-sm font-bold">
              INSPECTOR DE COLA SIN CONEXIÓN (ALMACÉN LOCAL)
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar inspector de cola sin conexión"
            className="btn-98 !px-2 !py-0.5 text-xs font-extrabold text-black"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="p-3 sm:p-4 flex flex-col gap-3 max-h-[80vh] overflow-y-auto text-xs">
          {/* Barra de acciones */}
          <div className="bevel-in bg-[#ece9d8] p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-[#000080]">
                Donaciones locales: {donacionesLocales.length} • Envíos pendientes: {mutaciones.length}
              </p>
              <p className="text-[11px] text-slate-700">
                Formato determinista: <code>OFFLINE-DON-&lt;YYMMDD&gt;-&lt;DEV4&gt;-&lt;SEQ3&gt;-&lt;ENT4&gt;</code>
              </p>
            </div>
            <button
              type="button"
              onClick={handleSincronizarAhora}
              disabled={sincronizando}
              className="btn-green min-h-[44px] px-4 font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>

          {mensajeSync && (
            <div className="bevel-in bg-[#f0fdf4] border border-green-700 p-2.5 text-green-950 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
              <span>{mensajeSync}</span>
            </div>
          )}

          {/* Sección 1: Donaciones Offline */}
          <section aria-label="Donaciones almacenadas localmente">
            <h3 className="font-bold text-[#000080] mb-1.5 uppercase">
              1. Almacén de donaciones locales ({donacionesLocales.length})
            </h3>
            {donacionesLocales.length === 0 ? (
              <div className="bevel-in bg-white p-3 text-slate-600">
                No hay donaciones registradas en la cola local de este dispositivo.
              </div>
            ) : (
              <div className="space-y-2">
                {donacionesLocales.map((item) => {
                  const codigo = item.codigoLocal || item.codigoTemporal || `OFFLINE-DON-${item.id}`;
                  const estado = item.syncStatus || item.estado;
                  return (
                    <div
                      key={item.id ?? codigo}
                      className="bevel-in bg-white p-2.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-[#000080] text-white px-2 py-0.5 font-bold text-[11px]">
                            {codigo}
                          </span>
                          {item.codigoServidor && (
                            <span className="bg-emerald-700 text-white px-2 py-0.5 font-bold text-[11px]">
                              → {item.codigoServidor}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 font-bold text-[10px] ${
                              estado === 'SINCRONIZADO'
                                ? 'bg-green-100 text-green-900'
                                : estado === 'ERROR'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {estado}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-800 mt-1">
                          <b>{item.tipoAlimento}</b> ({item.cantidadEstimada} {item.unidadMedida}) •{' '}
                          {item.requiereFrio ? 'Requiere Refrigeración' : 'Temperatura Ambiente'}
                        </p>
                        {item.lastError && (
                          <p className="text-[11px] text-red-700 font-bold mt-0.5">
                            Error: {item.lastError} (Reintentos: {item.retryCount ?? 0})
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <div>Clave de registro: {item.idempotencyKey?.slice(0, 8) || 'v1'}...</div>
                        <div>Reintentos: {item.retryCount ?? 0}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Sección 2: Mutaciones del Patrón Outbox */}
          <section aria-label="Envíos pendientes de sincronización">
            <h3 className="font-bold text-[#000080] mb-1.5 uppercase">
              2. Almacén de envíos pendientes ({mutaciones.length})
            </h3>
            {mutaciones.length === 0 ? (
              <div className="bevel-in bg-white p-3 text-slate-600">
                No hay envíos pendientes en la cola de sincronización.
              </div>
            ) : (
              <div className="space-y-2">
                {mutaciones.map((m) => (
                  <div
                    key={m.id ?? m.idempotencyKey}
                    className="bevel-in bg-white p-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-slate-800 text-white px-2 py-0.5 font-bold text-[10px]">
                          {m.tipoOperacion}
                        </span>
                        <span className="font-bold text-[#000080]">{m.entidadId}</span>
                        <span
                          className={`px-2 py-0.5 font-bold text-[10px] inline-flex items-center gap-1 ${
                            m.syncStatus === 'SINCRONIZADO'
                              ? 'bg-green-100 text-green-900'
                              : m.syncStatus === 'ERROR'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {m.syncStatus === 'PENDIENTE' && <Clock className="w-3 h-3" />}
                          {m.syncStatus === 'ERROR' && <AlertTriangle className="w-3 h-3" />}
                          {m.syncStatus === 'SINCRONIZADO' && <CheckCircle2 className="w-3 h-3" />}
                          {m.syncStatus}
                        </span>
                      </div>
                      {m.lastError && (
                        <p className="text-[11px] text-red-700 font-bold mt-1">
                          Último error: {m.lastError}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Clave de registro: {m.idempotencyKey} • Intentos: {m.retryCount}
                      </p>
                    </div>
                    {m.syncStatus === 'ERROR' && (
                      <button
                        type="button"
                        onClick={() => handleReintentarMutacion(m.id)}
                        className="btn-98 min-h-[38px] px-3 font-bold text-[#000080] flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reintentar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-end p-2 border-t border-[#808080] bg-[#ece9d8]">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-98 min-h-[40px] px-5 font-mono text-xs font-bold"
          >
            Cerrar Inspector
          </button>
        </footer>
      </div>
    </div>
  );
}

export default OutboxInspectorModal;
