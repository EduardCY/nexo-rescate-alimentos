'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Compass, Home, QrCode, Database } from 'lucide-react';

/**
 * Pantalla de contingencia ante desconexión de red (`/~offline` — CA-PWA.3 / TASK-28).
 *
 * ¿Por qué?: Cuando un comerciante o voluntario navega sin señal a una ruta aún no almacenada
 * en la caché del Service Worker, esta vista evita el error nativo del navegador y ofrece acceso
 * inmediato a las vistas operativas pre-cacheadas y al almacén local IndexedDB (Dexie.js).
 */
export default function OfflineFallbackPage() {
  const handleReintentar = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 p-4 flex items-center justify-center">
      <section
        aria-labelledby="offline-title"
        className="max-w-lg w-full rounded-2xl backdrop-blur-md bg-slate-900/90 border border-amber-500/40 p-6 sm:p-8 shadow-2xl text-center"
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
          <WifiOff className="w-7 h-7" aria-hidden="true" />
        </div>

        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          MODO SIN CONEXIÓN ACTIVO
        </span>

        <h1 id="offline-title" className="text-xl sm:text-2xl font-bold text-white mt-3 mb-2">
          Sin conexión a Internet en este momento
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
          Nexo Rescate de Alimentos continúa operando mediante almacenamiento local{' '}
          <strong className="text-emerald-300">IndexedDB (Dexie.js)</strong>. Tus donaciones y
          confirmaciones se guardarán con código determinista{' '}
          <code className="text-amber-300">OFFLINE-DON-...</code> y se sincronizarán automáticamente
          al recuperar señal celular o Wi-Fi.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center mb-6">
          <button
            type="button"
            onClick={handleReintentar}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reintentar Conexión</span>
          </button>
        </div>

        <div className="border-t border-slate-800 pt-4 text-left">
          <p className="font-mono text-[11px] font-bold uppercase text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Módulos pre-cacheados disponibles sin internet:</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
            <Link
              href="/"
              className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Mi Portal</span>
            </Link>
            <Link
              href="/donaciones"
              className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span>Catálogo</span>
            </Link>
            <Link
              href="/rastreo"
              className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Rastreo</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
