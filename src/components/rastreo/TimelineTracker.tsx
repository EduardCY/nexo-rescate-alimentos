'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Truck,
  Utensils,
} from 'lucide-react';
import type { ResultadoRastreoDonacion } from '@/actions/donaciones';

export interface TimelineTrackerProps {
  rastreo: ResultadoRastreoDonacion;
}

/**
 * Formatea una marca temporal ISO 8601 UTC al formato local colombiano (`es-CO`).
 *
 * ¿Por qué?: CA-04.3 y TASK-13 exigen que los hitos de custodia sean legibles por comerciantes
 * y coordinadores en el huso horario de Colombia sin exponer cadenas ISO crudas.
 */
export function formatearFechaColombia(iso?: string): string {
  if (!iso) return 'Pendiente de registro';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

const BADGE_ESTADO: Record<
  string,
  { label: string; clase: string }
> = {
  DISPONIBLE: {
    label: 'DISPONIBLE PARA RESCATE',
    clase: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
  },
  ASIGNADA: {
    label: 'EN RUTA (ASIGNADA A VOLUNTARIO)',
    clase: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
  },
  ENTREGADA: {
    label: 'ENTREGADA EN COMEDOR (ACTA CERRADA)',
    clase: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
  },
  EXPIRADA: {
    label: 'OFERTA EXPIRADA',
    clase: 'bg-slate-600/30 text-slate-300 border-slate-500/50',
  },
  CANCELADA: {
    label: 'OFERTA CANCELADA',
    clase: 'bg-red-500/20 text-red-300 border-red-500/50',
  },
};

/**
 * Línea de tiempo visual de trazabilidad en 3 hitos para seguimiento de donaciones (CMP-04 / TASK-13).
 *
 * ¿Por qué?: Permite a donantes, comedores y auditores verificar con transparencia el ciclo completo
 * de custodia desde la publicación en galería hasta la firma del acta en el comedor receptor.
 */
export function TimelineTracker({ rastreo }: TimelineTrackerProps) {
  if (!rastreo || !rastreo.encontrada || !rastreo.donacion) {
    return null;
  }
  const { donacion, eventos = [] } = rastreo;
  const badge = BADGE_ESTADO[donacion.estado] || BADGE_ESTADO.DISPONIBLE;

  const hito1Completado = true;
  const hito2Completado =
    donacion.estado === 'ASIGNADA' ||
    donacion.estado === 'ENTREGADA' ||
    Boolean(donacion.asignadaAt);
  const hito3Completado =
    donacion.estado === 'ENTREGADA' || Boolean(donacion.entregadaAt);

  return (
    <section
      aria-label={`Línea de tiempo de trazabilidad para ${donacion.codigo}`}
      className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-slate-700/80 p-4 sm:p-6 text-slate-100 shadow-xl"
    >
      {/* Encabezado del Lote y Badges de Estado / Cadena Térmica */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs sm:text-sm font-extrabold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded">
              {donacion.codigo}
            </span>
            <span
              className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.clase}`}
            >
              {badge.label}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {donacion.tipoAlimento} ({donacion.cantidadEstimada} {donacion.unidadMedida})
          </h2>
          <p className="text-xs font-mono text-slate-300 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              Origen: <b>{donacion.donanteNombre}</b> — {donacion.direccionRecogida} (Zona{' '}
              {donacion.zona || 'CENTRO'})
            </span>
          </p>
        </div>

        {/* Badge de Condición Térmica explícita (CA-01.4) */}
        <div className="flex flex-col items-end gap-1.5 font-mono text-xs">
          {donacion.requiereFrio ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950/90 text-sky-200 border border-sky-400/50 font-bold">
              <Snowflake className="w-4 h-4 text-sky-300" aria-hidden="true" />
              <span>Requiere Refrigeración (4°C - 8°C)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-600 font-semibold">
              <Thermometer className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Temperatura Ambiente</span>
            </span>
          )}
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Amparado por Ley 1990 de 2019</span>
          </span>
        </div>
      </header>

      {/* Línea de Tiempo Vertical / Horizontal de 3 Hitos de Custodia */}
      <ol className="relative border-l-2 border-slate-700 ml-3 sm:ml-4 space-y-6">
        {/* HITO 1: PUBLICACIÓN Y EXENCIÓN SANITARIA */}
        <li className="ml-6">
          <span
            className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-slate-900 ${
              hito1Completado ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <Package className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="rounded-xl bg-slate-800/70 border border-slate-700 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-emerald-300">
                1. Oferta Publicada en Red (Exención Ley 1990 Aceptada)
              </h3>
              <time className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded">
                {formatearFechaColombia(donacion.createdAt)}
              </time>
            </div>
            <p className="text-xs text-slate-300">
              Donante: <b>{donacion.donanteNombre}</b>. Límite de retiro:{' '}
              <b>{formatearFechaColombia(donacion.horaLimite)}</b>.
            </p>
            {donacion.comedorNombre && (
              <p className="text-xs text-sky-300 mt-1 font-mono">
                Comedor comunitario preasignado: <b>{donacion.comedorNombre}</b>
              </p>
            )}
          </div>
        </li>

        {/* HITO 2: RESERVA Y TRANSPORTE POR VOLUNTARIO */}
        <li className="ml-6">
          <span
            className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-slate-900 ${
              hito2Completado ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Truck className="w-4 h-4" aria-hidden="true" />
          </span>
          <div
            className={`rounded-xl border p-3.5 ${
              hito2Completado
                ? 'bg-slate-800/70 border-amber-500/40'
                : 'bg-slate-900/50 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-amber-300">
                2. Toma de Custodia y Despacho en Campo
              </h3>
              <time className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded">
                {hito2Completado
                  ? formatearFechaColombia(donacion.asignadaAt || donacion.createdAt)
                  : 'En espera de voluntario'}
              </time>
            </div>
            {hito2Completado ? (
              <p className="text-xs text-slate-200">
                Reservada por <b>{donacion.voluntarioNombre || 'Voluntario Verificado'}</b> hacia{' '}
                <b>{donacion.comedorNombre || 'Comedor Comunitario Receptor'}</b>.
              </p>
            ) : (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Disponible en el catálogo para que un voluntario acepte el rescate.</span>
              </p>
            )}
          </div>
        </li>

        {/* HITO 3: RECEPCIÓN FÍSICA Y ACTA EN COMEDOR */}
        <li className="ml-6">
          <span
            className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-slate-900 ${
              hito3Completado ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {hito3Completado ? (
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Utensils className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
          <div
            className={`rounded-xl border p-3.5 ${
              hito3Completado
                ? 'bg-sky-950/40 border-sky-500/50'
                : 'bg-slate-900/50 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-sky-300">
                3. Entrega Física y Acta Digital en Comedor Receptor
              </h3>
              <time className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded">
                {hito3Completado
                  ? formatearFechaColombia(donacion.entregadaAt)
                  : 'Pendiente de recepción'}
              </time>
            </div>
            {hito3Completado ? (
              <p className="text-xs text-emerald-200">
                Ciclo de custodia cerrado formalmente en{' '}
                <b>{donacion.comedorNombre || 'Comedor Comunitario'}</b>. Certificado de impacto
                habilitado.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Se completará cuando el voluntario o el comedor firmen el Acta Digital de Entrega.
              </p>
            )}
          </div>
        </li>
      </ol>

      {/* Bitácora detallada de eventos inmutables */}
      {eventos.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Bitácora de Eventos Auditados ({eventos.length})
          </h4>
          <ul className="space-y-1.5 font-mono text-xs">
            {eventos.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-lg"
              >
                <div>
                  <span className="text-emerald-400 font-bold">
                    {ev.estadoAnterior} → {ev.estadoNuevo}
                  </span>
                  <span className="text-slate-300 ml-2">{ev.observaciones}</span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {formatearFechaColombia(ev.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default TimelineTracker;
