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
      className="bevel-out bg-[#d4d0c8] p-3 sm:p-4 text-black font-mono text-xs space-y-3"
    >
      {/* Encabezado del Lote y Badges de Estado / Cadena Térmica */}
      <header className="bevel-in bg-[#f5f5f5] p-3 flex flex-wrap items-start justify-between gap-3 border border-gray-400">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-extrabold bg-[#000080] text-white px-2 py-0.5 bevel-in">
              {donacion.codigo}
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-gray-500">
              {badge.label}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-black">
            {donacion.tipoAlimento} ({donacion.cantidadEstimada} {donacion.unidadMedida})
          </h2>
          <p className="text-xs text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#000080] shrink-0" aria-hidden="true" />
            <span>
              Origen: <b>{donacion.donanteNombre}</b> — {donacion.direccionRecogida} (Zona{' '}
              {donacion.zona || 'CENTRO'})
            </span>
          </p>
        </div>

        {/* Badge de Condición Térmica explícita (CA-01.4) */}
        <div className="flex flex-col items-end gap-1 text-xs">
          {donacion.requiereFrio ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-950 border border-sky-600 font-bold">
              <Snowflake className="w-4 h-4 text-sky-700" aria-hidden="true" />
              <span>Requiere Cadena de Frío (4°C - 8°C)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-600 font-bold">
              <Thermometer className="w-4 h-4 text-amber-700" aria-hidden="true" />
              <span>Temperatura Ambiente</span>
            </span>
          )}
          <span className="text-[10px] text-gray-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Exención Legal: Ley 1990 de 2019</span>
          </span>
        </div>
      </header>

      {/* Diagrama de Bloques SCADA: 3 Hitos de Custodia */}
      <div className="space-y-2">
        <p className="font-bold text-[11px] uppercase tracking-wider text-gray-800">
          Flujo de Custodia y Trazabilidad Operativa (3 Hitos):
        </p>

        {/* HITO 1: PUBLICACIÓN */}
        <div className="bevel-out bg-[#ece9d8] p-3 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#a0a0a0] pb-1">
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold text-sm">●</span>
              <h3 className="font-bold text-xs text-black">
                1. OFERTA PUBLICADA EN RED (EXENCIÓN LEY 1990 ACEPTADA)
              </h3>
            </div>
            <time className="text-[11px] bg-white px-2 py-0.5 bevel-in font-bold text-gray-800">
              {formatearFechaColombia(donacion.createdAt)}
            </time>
          </div>
          <div className="bevel-in bg-white p-2 text-xs text-gray-800 space-y-0.5">
            <p>
              Donante Certificado: <b>{donacion.donanteNombre}</b>. Límite de retiro:{' '}
              <b>{formatearFechaColombia(donacion.horaLimite)}</b>.
            </p>
            {donacion.comedorNombre && (
              <p className="text-[#000080]">
                Comedor comunitario preasignado: <b>{donacion.comedorNombre}</b>
              </p>
            )}
          </div>
        </div>

        <div className="text-center font-bold text-gray-500 text-xs">▼</div>

        {/* HITO 2: DESPACHO EN RUTA */}
        <div className={`bevel-out p-3 space-y-1.5 ${hito2Completado ? 'bg-[#ece9d8]' : 'bg-[#e0ded8] opacity-80'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#a0a0a0] pb-1">
            <div className="flex items-center gap-2">
              <span className={hito2Completado ? 'text-amber-600 font-bold text-sm' : 'text-gray-400 text-sm'}>
                {hito2Completado ? '●' : '○'}
              </span>
              <h3 className="font-bold text-xs text-black">
                2. TOMA DE CUSTODIA Y TRANSPORTE LOGÍSTICO
              </h3>
            </div>
            <time className="text-[11px] bg-white px-2 py-0.5 bevel-in font-bold text-gray-800">
              {hito2Completado
                ? formatearFechaColombia(donacion.asignadaAt || donacion.createdAt)
                : 'En espera de voluntario'}
            </time>
          </div>
          <div className="bevel-in bg-white p-2 text-xs text-gray-800">
            {hito2Completado ? (
              <p>
                Asignado a: <b>{donacion.voluntarioNombre || 'Voluntario en Ruta'}</b> en desplazamiento hacia{' '}
                <b>{donacion.comedorNombre || 'Comedor Receptor'}</b>.
              </p>
            ) : (
              <p className="text-gray-500 italic">
                Oferta disponible en el catálogo de Cali para aceptación y despacho inmediato.
              </p>
            )}
          </div>
        </div>

        <div className="text-center font-bold text-gray-500 text-xs">▼</div>

        {/* HITO 3: RECEPCIÓN Y ACTA */}
        <div className={`bevel-out p-3 space-y-1.5 ${hito3Completado ? 'bg-[#ece9d8]' : 'bg-[#e0ded8] opacity-80'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#a0a0a0] pb-1">
            <div className="flex items-center gap-2">
              <span className={hito3Completado ? 'text-emerald-700 font-bold text-sm' : 'text-gray-400 text-sm'}>
                {hito3Completado ? '●' : '○'}
              </span>
              <h3 className="font-bold text-xs text-black">
                3. ENTREGA FÍSICA Y FIRMA DE ACTA DIGITAL EN COMEDOR
              </h3>
            </div>
            <time className="text-[11px] bg-white px-2 py-0.5 bevel-in font-bold text-gray-800">
              {hito3Completado
                ? formatearFechaColombia(donacion.entregadaAt)
                : 'Pendiente de entrega física'}
            </time>
          </div>
          <div className="bevel-in bg-white p-2 text-xs text-gray-800">
            {hito3Completado ? (
              <p className="text-emerald-950 font-bold">
                ✓ Ciclo de custodia cerrado formalmente en{' '}
                <b>{donacion.comedorNombre || 'Comedor Beneficiario'}</b>. Acta digital y certificado tributario disponibles.
              </p>
            ) : (
              <p className="text-gray-500 italic">
                El hito se cerrará una vez el comedor o transportista firmen la recepción física conforme.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bitácora detallada de eventos inmutables en terminal SCADA */}
      {eventos.length > 0 && (
        <div className="pt-2">
          <p className="font-bold text-[11px] uppercase tracking-wider text-gray-800 mb-1 flex items-center gap-1.5">
            <span>Bitácora Inmutable trazabilidad_eventos ({eventos.length}):</span>
          </p>
          <div className="scada-panel bg-[#070c18] border border-slate-700 p-2.5 max-h-48 overflow-y-auto space-y-1">
            {eventos.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1 text-[11px]"
              >
                <div>
                  <span className="text-emerald-400 font-bold">
                    {ev.estadoAnterior} → {ev.estadoNuevo}
                  </span>
                  <span className="text-slate-300 ml-2">{ev.observaciones}</span>
                </div>
                <span className="text-slate-400 text-[10px]">
                  {formatearFechaColombia(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default TimelineTracker;
