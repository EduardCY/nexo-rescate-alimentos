'use client';

import React, { useCallback } from 'react';
import { Clock, MapPin, ShieldCheck, Check } from 'lucide-react';
import type { Donacion, ZonaCali } from '@/types';
import { ColdChainBadge } from './ColdChainBadge';
import { useCountdown } from '@/lib/hooks/useCountdown';

interface DonacionCardProps {
  donacion: Donacion;
  onTomar?: (donacionId: string) => Promise<void> | void;
  onTomarDonacion?: (donacionId: string) => Promise<void> | void;
  onExpirada?: (donacionId: string) => void;
  tomando?: boolean;
  className?: string;
}

const ZONA_COLORES: Record<ZonaCali, { bg: string; text: string; border: string }> = {
  NORTE: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  CENTRO: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  SUR: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  ORIENTE: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  LADERA: { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
};

/**
 * Tarjeta de donación reactiva con cuenta regresiva en vivo (TASK-06 & TASK-16 / CA-02.1, CA-02.4)
 * e insignia destacada de cadena de frío (TASK-07 / CA-02.2).
 * Implementa accesibilidad táctil para dispositivos móviles (min-h-[48px]).
 */
export function DonacionCard({
  donacion,
  onTomar,
  onTomarDonacion,
  onExpirada,
  tomando = false,
  className = '',
}: DonacionCardProps) {
  const handleExpire = useCallback(() => {
    onExpirada?.(donacion.id);
  }, [onExpirada, donacion.id]);

  const {
    tiempoFormateado: textoTiempo,
    expirado,
    esMuyUrgente,
    esUrgenciaMedia,
  } = useCountdown(donacion.horaLimite, handleExpire);

  // Si ya expiró, no se renderiza (CA-02.4)
  if (expirado) {
    return null;
  }

  const zona = donacion.zona || 'CENTRO';
  const estiloZona = ZONA_COLORES[zona] || ZONA_COLORES.CENTRO;
  const handleAccionTomar = onTomar || onTomarDonacion;

  return (
    <article
      className={`bevel-out p-3.5 bg-[#ece9d8] text-black flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${className}`}
      aria-label={`Donación ${donacion.codigo}: ${donacion.tipoAlimento}`}
    >
      <div>
        {/* Cabecera: Código y Zona de Cali */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#808080]">
          <span className="font-mono text-xs font-bold bg-[#000080] text-white px-2 py-0.5 bevel-in">
            {donacion.codigo}
          </span>
          <span
            className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border"
            style={{
              backgroundColor: estiloZona.bg,
              color: estiloZona.text,
              borderColor: estiloZona.border,
            }}
          >
            ZONA {zona}
          </span>
        </div>

        {/* Producto y Cantidad */}
        <div className="mb-2.5">
          <h3 className="font-sans font-bold text-base text-[#000080] leading-snug">
            {donacion.tipoAlimento}
          </h3>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono">
            <span className="text-xl font-extrabold text-black">
              {donacion.cantidadEstimada}
            </span>
            <span className="text-xs uppercase text-slate-700 font-semibold">
              {donacion.unidadMedida}
            </span>
          </div>
        </div>

        {/* Donante y Dirección de recogida en Cali */}
        <div className="mb-3 flex flex-col gap-1 text-xs text-slate-800 font-mono">
          <p className="font-bold truncate text-slate-900">
            {donacion.donanteNombre}
          </p>
          <div className="flex items-start gap-1 text-[11px] text-slate-600">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#000080]" />
            <span className="leading-tight">{donacion.direccionRecogida}</span>
          </div>
        </div>

        {/* Badges de Estado: Cadena de Frío (TASK-07) y Ley 1990 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono">
          {donacion.requiereFrio ? (
            <ColdChainBadge
              requiereFrio={true}
              mostrarAdvertencia={true}
              size="sm"
            />
          ) : (
            <span className="bevel-in bg-[#f1f5f9] text-slate-700 px-2 py-0.5 font-semibold">
              Ambiente (sin frío)
            </span>
          )}

          {donacion.exencionSanitariaAceptada && (
            <span className="bevel-in bg-[#f0fdf4] text-green-800 px-2 py-0.5 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-green-600" />
              Ley 1990
            </span>
          )}
        </div>
      </div>

      {/* Pie de tarjeta: Temporizador reactivo y Botón de acción */}
      <div className="pt-2 border-t border-[#808080] flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-slate-600 text-[11px]">Tiempo restante:</span>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 font-extrabold bevel-in ${
              esMuyUrgente
                ? 'bg-red-100 text-red-700 animate-pulse border border-red-400'
                : esUrgenciaMedia
                ? 'bg-amber-100 text-amber-900'
                : 'bg-green-100 text-green-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{textoTiempo}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleAccionTomar?.(donacion.id)}
          disabled={tomando}
          className="btn-green w-full min-h-[48px] font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
          aria-label={`Tomar donación ${donacion.codigo}`}
        >
          {tomando ? (
            <span>RESERVANDO...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>TOMAR DONACIÓN</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export default DonacionCard;
