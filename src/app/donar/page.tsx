import React from 'react';
import Link from 'next/link';
import { Terminal, ArrowLeft } from 'lucide-react';
import { DonacionWizard } from '@/components/donaciones/DonacionWizard';
import { OfflineStatusBadge } from '@/components/donaciones/OfflineStatusBadge';

export const metadata = {
  title: 'Publicar Donación de Alimentos | NEXO Rescate',
  description: 'Formulario rápido en 3 pasos para publicar excedentes de alimentos bajo la Ley 1990 de 2019.',
};

/**
 * Pantalla dedicada a la publicación móvil de donaciones en 3 pasos.
 * Conserva la identidad visual Windows 98 / SCADA en un contenedor centrado apto para celulares en plaza.
 */
export default function DonarPage() {
  return (
    <main className="min-h-screen p-2 sm:p-4 lg:p-6">
      <div className="bevel-out mx-auto max-w-5xl p-[3px] shadow-[8px_8px_0_rgba(0,0,0,0.55)]">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 text-white shrink-0" />
            <h1 className="truncate font-mono text-xs sm:text-[13px] font-bold text-white tracking-wide">
              NEXO — PUBLICAR DONACIÓN DE ALIMENTOS
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/donaciones"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0"
            >
              <span>Ver Catálogo</span>
            </Link>
            <Link
              href="/"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Barra superior de estado e indicador Offline */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#808080] bg-[#d4d0c8] px-2 py-1.5">
          <span className="font-mono text-xs text-black font-bold">
            Plazas de Cali: Santa Elena • Cavasa • Alameda
          </span>
          <OfflineStatusBadge />
        </div>

        {/* Cuerpo principal oscuro SCADA con el Wizard */}
        <div className="bg-[#0b1020] m-[2px] p-3 sm:p-4 bevel-in-dark">
          <DonacionWizard />
        </div>

        {/* Barra de estado inferior */}
        <footer className="flex items-center justify-between gap-1 mt-1 text-[11px] text-black font-mono">
          <div className="bevel-in flex-1 px-2 py-0.5 truncate">
            Protección Legal: Ley 1990 de 2019 (Exención Sanitaria) • Habeas Data Ley 1581
          </div>
          <div className="bevel-in px-2 py-0.5 hidden sm:block">
            Modo Móvil Rápido
          </div>
        </footer>
      </div>
    </main>
  );
}