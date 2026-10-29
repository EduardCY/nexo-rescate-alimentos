'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, MapPin, Clock, ArrowRight, X } from 'lucide-react';
import type { Donacion } from '@/types';

interface ConflictoTomaModalProps {
  abierto: boolean;
  onCerrar: () => void;
  donacionesCercanas?: Donacion[];
  onSeleccionarDonacion?: (donacionId: string) => void;
}

/**
 * Modal reactivo empático ante colisión de toma concurrente (TASK-09 / CMP-03 / CA-03.2).
 * Evita desplazamientos innecesarios y sugiere ofertas vigentes cercanas.
 */
export function ConflictoTomaModal({
  abierto,
  onCerrar,
  donacionesCercanas = [],
  onSeleccionarDonacion,
}: ConflictoTomaModalProps) {
  // Manejo de tecla Escape para accesibilidad
  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflicto-titulo"
    >
      <div className="bevel-out w-full max-w-lg p-[3px] bg-[#d4d0c8] text-black shadow-[10px_10px_0_rgba(0,0,0,0.6)]">
        {/* Barra de título Windows 98 */}
        <div className="titlebar flex items-center justify-between px-2 py-1 text-white font-mono text-xs font-bold bg-[#800000]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-yellow-400 text-black font-extrabold flex items-center justify-center text-[10px]">
              !
            </span>
            <span id="conflicto-titulo">ALERTA DE ASIGNACIÓN CONCURRENTE</span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="btn-98 !px-1.5 !py-0 text-[11px] font-bold"
            aria-label="Cerrar modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 font-mono">
          {/* Mensaje de colisión empático (CA-03.2) */}
          <div className="bevel-in bg-[#ffffe1] border border-amber-600 p-3 text-amber-950 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-950 leading-snug">
                Esta donación acaba de ser reservada por otra persona.
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Otro voluntario de la red confirmó la recogida unos segundos antes. Para que no te desplaces innecesariamente, te sugerimos estas otras ofertas disponibles cercanas en Cali:
              </p>
            </div>
          </div>

          {/* Listado de sugerencias de ofertas cercanas */}
          {donacionesCercanas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#000080] mb-2 uppercase tracking-wide">
                Ofertas cercanas disponibles ahora:
              </p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1 bevel-in bg-white">
                {donacionesCercanas.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="p-2 border border-slate-300 hover:bg-sky-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-black truncate">
                        {d.tipoAlimento} ({d.cantidadEstimada} {d.unidadMedida})
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-[#000080]" />
                          {d.zona}
                        </span>
                        <span>•</span>
                        <span className="truncate">{d.donanteNombre}</span>
                      </div>
                    </div>
                    {onSeleccionarDonacion && (
                      <button
                        type="button"
                        onClick={() => {
                          onCerrar();
                          onSeleccionarDonacion(d.id);
                        }}
                        className="btn-98 min-h-[36px] px-2.5 text-[11px] shrink-0 font-bold text-[#000080]"
                      >
                        Tomar &gt;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de cierre amigable (>= 48px de altura táctil) */}
          <div className="pt-2 border-t border-[#808080] flex justify-end">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-green w-full sm:w-auto min-h-[48px] px-6 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
              autoFocus
            >
              <span>Entendido, ver ofertas cercanas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictoTomaModal;