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
  onLiberarMision?: (misionId: string) => Promise<void> | void;
  className?: string;
}

/**
 * Tarjeta móvil de ruta activa para el voluntario asignado en campo (TASK-18 / CA-03.1).
 * Revela dirección exacta de recogida, contacto del comerciante donante y enlace directo
 * al acta de confirmación de entrega en comedor (`/entregas/[id]`).
 */
export function RutaActivaCard({
  mision,
  onLiberarMision,
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
      className={`bevel-out bg-[#d4d0c8] p-3 sm:p-4 text-black font-mono text-xs space-y-3 max-w-2xl mx-auto shadow-[6px_6px_0_rgba(0,0,0,0.45)] ${className}`}
      aria-labelledby="titulo-mision-activa"
    >
      {/* Encabezado de la Misión */}
      <header className="bevel-in bg-[#f5f5f5] p-3 flex flex-wrap items-center justify-between gap-2 border border-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase bg-amber-600 text-white px-2 py-0.5 bevel-in">
            MISIÓN EN CURSO
          </span>
          <h2
            id="titulo-mision-activa"
            className="text-lg font-bold text-black"
          >
            LOTE: {mision.codigo}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-950 border border-amber-600 px-2.5 py-1 text-[11px] font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
          <span>Retirar antes de: <u>{horaFormateada}</u></span>
        </div>
      </header>

      {/* Alimento a Rescatar */}
      <section className="bevel-in bg-white p-3 space-y-2 border border-gray-400">
        <div className="border-b border-gray-300 pb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-gray-600">
            1. Alimento Perecedero a Transportar
          </span>
          <span className="text-[10px] text-[#000080] font-bold">
            Normativa Ley 1990
          </span>
        </div>

        <p className="text-base font-bold text-black">
          {mision.tipoAlimento}
        </p>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 px-2 py-0.5 border border-emerald-600 font-bold text-xs">
            <Scale className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
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

      {/* Punto de Recogida (Donante) */}
      <section className="bevel-in bg-white p-3 space-y-2 border border-gray-400">
        <div className="border-b border-gray-300 pb-1">
          <span className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-[#000080]" aria-hidden="true" />
            <span>2. Punto de Recogida (Comercio Donante)</span>
          </span>
        </div>

        <p className="text-sm font-bold text-black">
          {mision.donanteNombre}
        </p>

        <div className="flex items-start gap-1.5 text-xs text-gray-800">
          <MapPin className="w-4 h-4 text-[#000080] shrink-0 mt-0.5" aria-hidden="true" />
          <span className="font-semibold">{mision.direccionRecogida}</span>
        </div>

        {mision.indicacionesPuesto && (
          <div className="bg-[#fff9e6] p-2 border border-amber-400 text-amber-950 text-[11px] flex items-start gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold">Indicaciones exactas: </span>
              <span>{mision.indicacionesPuesto}</span>
            </div>
          </div>
        )}
      </section>

      {/* Destino (Comedor Receptor) */}
      {mision.comedorNombre && (
        <section className="bevel-in bg-white p-3 space-y-1.5 border border-gray-400">
          <span className="text-[10px] uppercase font-bold text-[#000080] block border-b border-gray-300 pb-1">
            3. Destino: Comedor Comunitario / Olla Comunitaria
          </span>
          <p className="font-bold text-black text-sm">
            {mision.comedorNombre}
          </p>
          {mision.comedorDireccion && (
            <p className="text-gray-700 text-xs">{mision.comedorDireccion}</p>
          )}
        </section>
      )}

      {/* Botonera de Acción Ergonómica */}
      <nav aria-label="Acciones de campo" className="space-y-2 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-blue text-xs font-bold flex items-center justify-center gap-1.5 text-center min-h-[42px]"
          >
            <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Navegar con Google Maps</span>
          </a>

          {mision.telefonoDonante ? (
            <a
              href={`tel:${mision.telefonoDonante}`}
              className="btn-98 text-xs font-bold flex items-center justify-center gap-1.5 text-center min-h-[42px] text-[#000080]"
            >
              <Phone className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>Llamar al Comerciante</span>
            </a>
          ) : (
            <div className="bevel-in bg-[#f0f0f0] text-gray-500 font-mono text-[11px] flex items-center justify-center gap-1.5 text-center min-h-[42px]">
              <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Contacto en puesto</span>
            </div>
          )}
        </div>

        <Link
          href={`/entregas/${mision.id}`}
          className="btn-green w-full py-3 text-xs sm:text-sm font-black flex items-center justify-center gap-2 text-center"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>CONFIRMAR ENTREGA FÍSICA EN COMEDOR &gt;</span>
        </Link>

        {onLiberarMision && (
          <button
            type="button"
            onClick={() => onLiberarMision(mision.id)}
            className="btn-98 w-full py-2 text-xs font-bold text-red-800 flex items-center justify-center gap-1.5 text-center hover:bg-red-50"
            title="Liberar asignación si tuviste un imprevisto mecánico o fuerza mayor (RF-010)"
          >
            <span>⚠️ Reportar Imprevisto / Liberar Donación (RF-010)</span>
          </button>
        )}
      </nav>
    </article>
  );
}

export default RutaActivaCard;
