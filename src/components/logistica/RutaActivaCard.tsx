'use client';

import React from 'react';
import Link from 'next/link';
import {
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  Store,
  MapPin,
  Scale,
  Compass,
} from 'lucide-react';
import { ColdChainBadge } from '@/components/donaciones/ColdChainBadge';

export interface MisionActiva {
  id: string;
  codigo: string;
  tipoAlimento: string;
  cantidadEstimada: number;
  unidadMedida: string;
  donanteNombre: string;
  direccionRecogida: string;
  indicacionesPuesto?: string;
  telefonoDonante?: string;
  requiereFrio: boolean;
  horaLimite: string;
  comedorNombre?: string;
  comedorDireccion?: string;
}

interface RutaActivaCardProps {
  mision: MisionActiva;
  className?: string;
}

/**
 * Tarjeta móvil de ruta activa para el voluntario asignado en campo (TASK-18 / CA-03.1).
 * Revela dirección exacta de recogida, contacto del comerciante donante y enlace directo
 * al acta de confirmación de entrega en comedor (`/entregas/[id]`).
 */
export function RutaActivaCard({
  mision,
  className = '',
}: RutaActivaCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${mision.direccionRecogida}, Cali, Colombia`
  )}`;

  const horaFormateada = (() => {
    const d = new Date(mision.horaLimite);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return mision.horaLimite;
  })();

  return (
    <article
      className={`rounded-2xl bg-slate-900 border-2 border-slate-700 shadow-xl p-4 sm:p-5 flex flex-col gap-4 text-slate-100 ${className}`}
      aria-labelledby="titulo-mision-activa"
    >
      <header className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded">
            MISIÓN EN CURSO
          </span>
          <h2
            id="titulo-mision-activa"
            className="text-2xl font-black text-white font-mono mt-1"
          >
            {mision.codigo}
          </h2>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retirar antes de {horaFormateada}</span>
          </span>
        </div>
      </header>

      <section className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-2.5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Alimento a Rescatar
          </span>
          <p className="text-lg font-bold text-white leading-snug">
            {mision.tipoAlimento}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-300 bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-500/30">
            <Scale className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>
              {mision.cantidadEstimada} {mision.unidadMedida}
            </span>
          </div>

          <ColdChainBadge
            requiereFrio={mision.requiereFrio}
            mostrarAdvertencia={true}
            size="sm"
          />
        </div>
      </section>

      <section className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-2.5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            Punto de Recogida y Comerciante Donante
          </span>
          <p className="text-base font-bold text-white mt-0.5">
            {mision.donanteNombre}
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-slate-200">
          <MapPin
            className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span className="font-medium leading-snug">
            {mision.direccionRecogida}
          </span>
        </div>

        {mision.indicacionesPuesto && (
          <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
            <Compass
              className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="leading-snug">
              <span className="font-bold block">
                Ubicación exacta del puesto:
              </span>
              <span>{mision.indicacionesPuesto}</span>
            </div>
          </div>
        )}
      </section>

      {mision.comedorNombre && (
        <section className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-300">
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block">
            Destino: Comedor Comunitario
          </span>
          <p className="font-bold text-white text-sm mt-0.5">
            {mision.comedorNombre}
          </p>
          {mision.comedorDireccion && (
            <p className="text-slate-400 mt-0.5">{mision.comedorDireccion}</p>
          )}
        </section>
      )}

      <nav
        aria-label="Acciones ergonómicas de campo"
        className="flex flex-col gap-2.5 pt-1"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700
              text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-900/30
              transition-colors select-none text-center
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Navigation className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Abrir en Google Maps</span>
          </a>

          {mision.telefonoDonante ? (
            <a
              href={`tel:${mision.telefonoDonante}`}
              className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800/80
                text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center justify-center gap-2
                transition-colors select-none text-center
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Phone
                className="w-5 h-5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span>Llamar al Comerciante</span>
            </a>
          ) : (
            <span className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-950 text-slate-400 border border-slate-800 font-mono text-xs flex items-center justify-center gap-2 text-center">
              <Phone className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>Contacto en puesto de recogida</span>
            </span>
          )}
        </div>

        <Link
          href={`/entregas/${mision.id}`}
          className="min-h-[52px] w-full px-4 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
            text-slate-950 font-black text-sm sm:text-base font-mono uppercase tracking-wider
            flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20
            transition-all select-none text-center mt-1
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <CheckCircle2
            className="w-5 h-5 text-slate-950 shrink-0"
            aria-hidden="true"
          />
          <span>Confirmar Entrega en Comedor</span>
        </Link>
      </nav>
    </article>
  );
}

export default RutaActivaCard;
