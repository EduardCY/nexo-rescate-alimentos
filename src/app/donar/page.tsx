import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, HeartHandshake } from 'lucide-react';
import { DonacionWizard } from '@/components/donaciones/DonacionWizard';
import { OfflineStatusBadge } from '@/components/donaciones/OfflineStatusBadge';

export const metadata = {
  title: 'Publicar Donación | Nexo Rescate de Alimentos',
  description: 'Publica alimentos aptos para consumo humano para comedores comunitarios de Cali en menos de 45 segundos.',
};

/**
 * Página principal de registro y publicación de donaciones (CMP-01).
 * Optimizada para dispositivos móviles bajo RNF-001 y con resiliencia Offline-First (RNF-002).
 */
export default function DonarPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Encabezado y Navegación */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 flex items-center justify-center transition-all touch-target"
            aria-label="Volver al panel principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                CMP-01 · Donación Rápida
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Publicar Alimentos para Rescate
            </h1>
          </div>
        </div>

        {/* Indicador de Conectividad Reactivo */}
        <div className="self-end sm:self-center">
          <OfflineStatusBadge />
        </div>
      </header>

      {/* Contenido Principal: Wizard en 3 Pasos */}
      <section>
        <DonacionWizard />
      </section>

      {/* Pie de Página de Cumplimiento Legal y Normativo */}
      <footer className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Protegido por la <b>Ley 1990 de 2019</b> (Exención de Responsabilidad Sanitaria)</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <HeartHandshake className="w-4 h-4 text-sky-400" />
          <span>Fundación Mesa Común · Alcaldía de Cali</span>
        </div>
      </footer>
    </main>
  );
}
