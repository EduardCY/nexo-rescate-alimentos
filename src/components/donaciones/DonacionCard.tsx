'use client';

import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Snowflake, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import type { Donacion, ZonaCali } from '@/types';

interface DonacionCardProps {
  donacion: Donacion;
  onTomar?: (donacionId: string) => Promise<void> | void;
  onExpirada?: (donacionId: string) => void;
  tomando?: boolean;
}

const ZONA_COLORES: Record<ZonaCali, { bg: string; text: string; border: string }> = {
  NORTE: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  CENTRO: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  SUR: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  ORIENTE: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  LADERA: { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
};

/**
 * Tarjeta de donación reactiva con cuenta regresiva en vivo (TASK-06 / CA-02.1).
 * Implementa accesibilidad táctil para dispositivos móviles (min-h-[48px]).
 */
export function DonacionCard({ donacion, onTomar, onExpirada, tomando = false }: DonacionCardProps) {
  const [segundosRestantes, setSegundosRestantes] = useState<number>(() => {
    const ms = new Date(donacion.horaLimite).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = new Date(donacion.horaLimite).getTime() - Date.now();
      const seg = Math.max(0, Math.floor(ms / 1000));
      setSegundosRestantes(seg);

      if (seg === 0) {
        onExpirada?.(donacion.id);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [donacion.horaLimite, donacion.id, onExpirada]);

  // Si ya expiró, no se renderiza (CA-02.4)
  if (segundosRestantes <= 0) {
    return null;
  }

  // Formato HH:MM:SS
  const horas = Math.floor(segundosRestantes / 3600);
  const minutos = Math.floor((segundosRestantes % 3600) / 60);
  const segundos = segundosRestantes % 60;
  const textoTiempo = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

  // Nivel de urgencia
  const esMuyUrgente = horas < 2;
  const esUrgenciaMedia = horas >= 2 && horas < 4;

  const zona = donacion.zona || 'CENTRO';
  const estiloZona = ZONA_COLORES[zona] || ZONA_COLORES.CENTRO;

  return (
    <article
      className="bevel-out p-3.5 bg-[#ece9d8] text-black flex flex-col justify-between transition-all shadow-sm hover:shadow-md"
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
            style={{ backgroundColor: estiloZona.bg, color: estiloZona.text, borderColor: estiloZona.border }}
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

        {/* Badges de Estado: Frío y Ley 1990 */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] font-mono">
          {donacion.requiereFrio ? (
            <span className="bevel-in bg-[#e0f2fe] text-[#0369a1] px-2 py-0.5 font-bold flex items-center gap-1 border border-sky-400">
              <Snowflake className="w-3 h-3 text-sky-600" />
              CADENA DE FRÍO (4°C - 8°C)
            </span>
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
          onClick={() => onTomar?.(donacion.id)}
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