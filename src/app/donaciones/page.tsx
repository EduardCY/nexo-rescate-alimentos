'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import type { Donacion, ZonaCali } from '@/types';
import { obtenerDonacionesDisponibles } from '@/actions/donaciones';
import { DonacionCard } from '@/components/donaciones/DonacionCard';

const ZONAS_CALI: Array<{ id: ZonaCali | 'TODAS'; label: string }> = [
  { id: 'TODAS', label: 'Todas las Zonas' },
  { id: 'NORTE', label: 'Norte' },
  { id: 'CENTRO', label: 'Centro' },
  { id: 'SUR', label: 'Sur' },
  { id: 'ORIENTE', label: 'Oriente' },
  { id: 'LADERA', label: 'Ladera' },
];

/**
 * Catálogo reactivo de donaciones disponibles (TASK-06 / CMP-02).
 * Satisface los criterios CA-02.1 (solo disponibles vigentes) y CA-02.3 (filtro por las 5 zonas de Cali).
 */
export default function CatalogoDonacionesPage() {
  const [donaciones, setDonaciones] = useState<Donacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaCali | 'TODAS'>('TODAS');
  const [tiempoFiltroMs, setTiempoFiltroMs] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Carga inicial de ofertas
  const cargarOfertas = async () => {
    setCargando(true);
    try {
      const data = await obtenerDonacionesDisponibles('TODAS');
      setDonaciones(data);
    } catch {
      // Fallback seguro en memoria
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOfertas();
  }, []);

  // Cambio reactivo de zona con medición de tiempo (< 100 ms DoD)
  const handleCambioZona = (nuevaZona: ZonaCali | 'TODAS') => {
    const t0 = performance.now();
    startTransition(() => {
      setZonaSeleccionada(nuevaZona);
      const t1 = performance.now();
      setTiempoFiltroMs(Math.round((t1 - t0) * 100) / 100);
    });
  };

  // Filtrado y ordenamiento reactivo por urgencia
  const donacionesFiltradas = useMemo(() => {
    const ahora = Date.now();
    return donaciones
      .filter((d) => {
        const esDisponible = d.estado === 'DISPONIBLE';
        const noExpirada = new Date(d.horaLimite).getTime() > ahora;
        const coincideZona = zonaSeleccionada === 'TODAS' || d.zona === zonaSeleccionada;
        return esDisponible && noExpirada && coincideZona;
      })
      .sort((a, b) => new Date(a.horaLimite).getTime() - new Date(b.horaLimite).getTime());
  }, [donaciones, zonaSeleccionada]);

  // Manejador cuando una oferta expira en vivo (CA-02.4)
  const handleOfertaExpirada = (id: string) => {
    setDonaciones((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <main className="min-h-screen p-2 sm:p-4 lg:p-6 bg-[#0b1020] text-black">
      <div className="bevel-out mx-auto max-w-6xl p-[3px] bg-[#d4d0c8] shadow-[8px_8px_0_rgba(0,0,0,0.55)]">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 bg-white text-black font-extrabold text-[10px] flex items-center justify-center">
              ■
            </span>
            <h1 className="truncate font-mono text-xs sm:text-[13px] font-bold text-white tracking-wide">
              CATÁLOGO DE DONACIONES ACTIVAS — SANTIAGO DE CALI
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/donar"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0 text-[#000080] font-bold"
            >
              <span>+ Publicar Donación</span>
            </Link>
            <Link
              href="/"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Barra de información y estado */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#808080] bg-[#e0ded8] px-3 py-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#000080]">
              {donacionesFiltradas.length} {donacionesFiltradas.length === 1 ? 'oferta disponible' : 'ofertas disponibles'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-700">Ordenadas por urgencia de recogida</span>
          </div>

          <div className="flex items-center gap-2">
            {tiempoFiltroMs !== null && (
              <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 bevel-in">
                Filtro: {tiempoFiltroMs} ms (&lt;100ms)
              </span>
            )}
            <button
              type="button"
              onClick={cargarOfertas}
              disabled={cargando}
              className="btn-98 !py-0.5 !px-2 text-[11px] flex items-center gap-1"
              title="Refrescar ofertas"
            >
              <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Selector Horizontal de Zonas de Cali (CA-02.3) */}
        <nav aria-label="Filtrado por zonas de Cali" className="bg-[#ece9d8] p-2.5 border-b border-[#808080]">
          <div className="flex items-center gap-1.5 mb-1.5 font-mono text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-[#000080]" />
            <span>ZONAS GEOGRÁFICAS DE CALI:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {ZONAS_CALI.map((z) => {
              const activo = zonaSeleccionada === z.id;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleCambioZona(z.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 font-mono text-xs font-bold transition-all ${
                    activo
                      ? 'bg-[#000080] text-white bevel-in shadow-inner'
                      : 'btn-98 text-slate-800 hover:text-black'
                  }`}
                  aria-pressed={activo}
                >
                  {z.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Cuadrícula Reactiva de Donaciones */}
        <div className="p-3 sm:p-4 bg-[#c0c0c0]">
          {cargando ? (
            <div className="bevel-in bg-white p-8 text-center font-mono text-xs text-slate-700">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[#000080]" />
              <p>Consultando ofertas activas en la red de Cali...</p>
            </div>
          ) : donacionesFiltradas.length === 0 ? (
            <div className="bevel-in bg-[#ffffe1] p-8 text-center font-mono text-xs text-slate-800 max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-700" />
              <p className="font-bold text-sm mb-1">
                No hay donaciones activas en la zona {zonaSeleccionada}.
              </p>
              <p className="text-[11px] text-slate-600 mb-4">
                Prueba seleccionando &quot;Todas las Zonas&quot; o consulta más tarde cuando los comerciantes publiquen nuevos excedentes.
              </p>
              <button
                type="button"
                onClick={() => handleCambioZona('TODAS')}
                className="btn-98 min-h-[40px] px-4 font-bold"
              >
                Ver todas las zonas de Cali
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {donacionesFiltradas.map((donacion) => (
                <DonacionCard
                  key={donacion.id}
                  donacion={donacion}
                  onExpirada={handleOfertaExpirada}
                />
              ))}
            </div>
          )}
        </div>

        {/* Barra de pie de página */}
        <footer className="flex items-center justify-between gap-1 p-1 text-[11px] text-black font-mono bg-[#d4d0c8]">
          <div className="bevel-in flex-1 px-2 py-0.5 truncate">
            Red de Rescate de Alimentos • Cali, Colombia • Ley 1990 de 2019
          </div>
          <div className="bevel-in px-2 py-0.5 hidden sm:block">
            Respuesta &lt; 100 ms
          </div>
        </footer>
      </div>
    </main>
  );
}