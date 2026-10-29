'use client';

import React from 'react';
import { Clock, MapPin, Scale, Store, ChevronRight } from 'lucide-react';
import type { Donacion } from '@/types';
import ColdChainBadge from './ColdChainBadge';

interface DonacionCardProps {
  donacion: Donacion;
  onTomarDonacion?: (id: string) => void;
  className?: string;
}

export default function DonacionCard({
  donacion,
  onTomarDonacion,
  className = '',
}: DonacionCardProps) {
  const calcularTiempoRestante = (horaLimiteStr: string) => {
    const limite = new Date(horaLimiteStr);
    const ahora = new Date();
    const diffMs = limite.getTime() - ahora.getTime();

    if (diffMs <= 0) return { texto: 'Expirada', urgente: true };

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) {
      return {
        texto: `${diffHrs}h ${diffMins}m restantes`,
        urgente: diffHrs < 3,
      };
    }
    return {
      texto: `${diffMins}m restantes`,
      urgente: true,
    };
  };

  const tiempo = calcularTiempoRestante(donacion.horaLimite);

  return (
    <article
      className={`rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm flex flex-col justify-between gap-3 text-slate-100 ${className}`}
      aria-labelledby={`donacion-titulo-${donacion.id}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
              {donacion.codigo}
            </span>
            {donacion.zona && (
              <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                {donacion.zona}
              </span>
            )}
          </div>

          <div
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
              tiempo.urgente
                ? 'bg-rose-950/90 text-rose-300 border border-rose-500/60 animate-pulse'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{tiempo.texto}</span>
          </div>
        </div>

        <div>
          <h3
            id={`donacion-titulo-${donacion.id}`}
            className="text-base font-bold text-white tracking-tight"
          >
            {donacion.tipoAlimento}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{donacion.donanteNombre}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-mono text-emerald-300 bg-slate-950/60 border border-slate-800 px-2.5 py-1.5 rounded-lg w-fit">
          <Scale className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="font-bold">
            {donacion.cantidadEstimada} {donacion.unidadMedida}
          </span>
        </div>

        <ColdChainBadge
          requiereFrio={donacion.requiereFrio}
          mostrarAdvertencia={true}
          size="sm"
          className="mt-1"
        />

        <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-snug">{donacion.direccionRecogida}</span>
        </p>
      </div>

      {onTomarDonacion && (
        <button
          onClick={() => onTomarDonacion(donacion.id)}
          className="mt-2 w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
            text-slate-950 font-bold text-xs font-mono uppercase tracking-wider
            flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-500/10
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <span>Tomar Donación</span>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
