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

/**
 * Barra interactiva de filtrado táctil por sectores geográficos de Santiago de Cali (CA-02.3 / TASK-07).
 * Garantiza áreas de toque accesibles (>= 44x44px) y navegación por pestañas ARIA.
 */
export function ZonasFilter({
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
      <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-800 font-mono">
        <MapPin className="w-3.5 h-3.5 text-[#000080]" aria-hidden="true" />
        <span>SECTOR GEOGRÁFICO DE CALI:</span>
      </div>

      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 pt-0.5"
      >
        {ZONAS_CALI.map((zona) => {
          const estaActiva = zonaSeleccionada === zona;
          const conteo = conteosPorZona ? conteosPorZona[zona] : undefined;

          return (
            <button
              key={zona}
              type="button"
              role="tab"
              id={`tab-zona-${zona.toLowerCase()}`}
              aria-selected={estaActiva}
              aria-controls="panel-donaciones"
              onClick={() => onSelectZona(zona)}
              className={`min-h-[44px] min-w-[44px] px-3.5 py-1.5 text-xs font-bold font-mono tracking-wider
                transition-all duration-150 flex items-center justify-center gap-1.5 shrink-0 select-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000080]
                ${
                  estaActiva
                    ? 'bg-[#000080] text-white bevel-in shadow-inner'
                    : 'btn-98 text-slate-800 hover:text-black'
                }`}
            >
              <span>{zona === 'TODAS' ? 'TODAS LAS ZONAS' : zona}</span>
              {conteo !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    estaActiva
                      ? 'bg-white text-[#000080] font-extrabold'
                      : 'bg-slate-200 text-slate-800 border border-slate-400'
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

export default ZonasFilter;
