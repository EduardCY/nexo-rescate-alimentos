'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { ZonaFiltro } from '@/types';

export const ZONAS_CALI: ZonaFiltro[] = [
  'TODAS',
  'NORTE',
  'CENTRO',
  'SUR',
  'ORIENTE',
  'LADERA',
];

interface ZonasFilterProps {
  zonaSeleccionada: ZonaFiltro;
  onSelectZona: (zona: ZonaFiltro) => void;
  conteosPorZona?: Record<ZonaFiltro, number>;
  className?: string;
}

export default function ZonasFilter({
  zonaSeleccionada,
  onSelectZona,
  conteosPorZona,
  className = '',
}: ZonasFilterProps) {
  return (
    <nav
      aria-label="Filtro geográfico por sector de Cali"
      className={`w-full ${className}`}
    >
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-300 font-mono">
        <MapPin className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
        <span>SECTOR DE CALI:</span>
      </div>

      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {ZONAS_CALI.map((zona) => {
          const estaActiva = zonaSeleccionada === zona;
          const conteo = conteosPorZona ? conteosPorZona[zona] : undefined;

          return (
            <button
              key={zona}
              role="tab"
              id={`tab-zona-${zona.toLowerCase()}`}
              aria-selected={estaActiva}
              aria-controls="panel-donaciones"
              onClick={() => onSelectZona(zona)}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider
                transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 select-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                ${
                  estaActiva
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
            >
              <span>{zona}</span>
              {conteo !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                    estaActiva
                      ? 'bg-slate-950 text-emerald-300'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {conteo}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
