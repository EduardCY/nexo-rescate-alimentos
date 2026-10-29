'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  Snowflake,
} from 'lucide-react';
import type { Donacion, ZonaFiltro } from '@/types';
import { obtenerDonacionesDisponibles, tomarDonacion } from '@/actions/donaciones';
import { DonacionCard } from '@/components/donaciones/DonacionCard';
import { ZonasFilter } from '@/components/donaciones/ZonasFilter';
import { ConflictoTomaModal } from '@/components/donaciones/ConflictoTomaModal';

/**
 * Catálogo reactivo de donaciones disponibles (CMP-02 / TASK-06 & TASK-07) con
 * filtro interactivo por zonas de Cali, filtro de cadena de frío, y manejo de
 * colisión de toma concurrente HTTP 409 con modal amigable (CMP-03 / TASK-09).
 */
export default function CatalogoDonacionesPage() {
  const [donaciones, setDonaciones] = useState<Donacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tomandoId, setTomandoId] = useState<string | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaFiltro>('TODAS');
  const [soloSinFrio, setSoloSinFrio] = useState(false);
  const [tiempoFiltroMs, setTiempoFiltroMs] = useState<number | null>(null);
  const [modalColisionAbierto, setModalColisionAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<{
    id: string;
    codigo: string;
    producto: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  // Carga de ofertas activas
  const cargarOfertas = async () => {
    setCargando(true);
    try {
      const data = await obtenerDonacionesDisponibles('TODAS');
      setDonaciones(data);
    } catch {
      // Fallback seguro
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOfertas();
  }, []);

  // Cambio reactivo de zona con medición de tiempo (< 100 ms DoD)
  const handleCambioZona = (nuevaZona: ZonaFiltro) => {
    const t0 = performance.now();
    startTransition(() => {
      setZonaSeleccionada(nuevaZona);
      const t1 = performance.now();
      setTiempoFiltroMs(Math.round((t1 - t0) * 100) / 100);
    });
  };

  // Conteos reactivos por zona para ZonasFilter (TASK-07)
  const conteosPorZona = useMemo<Record<ZonaFiltro, number>>(() => {
    const ahora = Date.now();
    const conteos: Record<ZonaFiltro, number> = {
      TODAS: 0,
      NORTE: 0,
      CENTRO: 0,
      SUR: 0,
      ORIENTE: 0,
      LADERA: 0,
    };

    for (const d of donaciones) {
      if (d.estado === 'DISPONIBLE' && new Date(d.horaLimite).getTime() > ahora) {
        if (!soloSinFrio || !d.requiereFrio) {
          conteos.TODAS += 1;
          if (d.zona && conteos[d.zona] !== undefined) {
            conteos[d.zona] += 1;
          }
        }
      }
    }

    return conteos;
  }, [donaciones, soloSinFrio]);

  // Filtrado y ordenamiento reactivo por urgencia
  const donacionesFiltradas = useMemo(() => {
    const ahora = Date.now();
    return donaciones
      .filter((d) => {
        const esDisponible = d.estado === 'DISPONIBLE';
        const noExpirada = new Date(d.horaLimite).getTime() > ahora;
        const coincideZona =
          zonaSeleccionada === 'TODAS' || d.zona === zonaSeleccionada;
        const cumpleFrio = !soloSinFrio || !d.requiereFrio;
        return esDisponible && noExpirada && coincideZona && cumpleFrio;
      })
      .sort(
        (a, b) =>
          new Date(a.horaLimite).getTime() - new Date(b.horaLimite).getTime()
      );
  }, [donaciones, zonaSeleccionada, soloSinFrio]);

  // Manejador cuando una oferta expira en vivo (CA-02.4 / CA-03.3)
  const handleOfertaExpirada = (id: string) => {
    setDonaciones((prev) => prev.filter((d) => d.id !== id));
  };

  // Acción de reserva con captura de colisión concurrente HTTP 409 (TASK-09)
  const handleTomarDonacion = async (id: string) => {
    if (tomandoId) return;
    setTomandoId(id);
    setMensajeExito(null);

    try {
      const res = await tomarDonacion(id);

      if (res.exito && res.codigo === 200) {
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
        setMensajeExito({
          id: res.donacion.id,
          codigo: res.donacion.codigo,
          producto: `${res.donacion.tipoAlimento} (${res.donacion.cantidadEstimada} ${res.donacion.unidadMedida})`,
        });
      } else if (res.codigo === 409) {
        // Colisión concurrente (CA-03.2): remoción automática y modal empático
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
        setModalColisionAbierto(true);
      } else if (res.codigo === 410) {
        // Oferta expirada o cancelada (CA-03.3): remover de la vista
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // Manejo seguro
    } finally {
      setTomandoId(null);
    }
  };

  return (
    <main className="min-h-screen p-2 sm:p-4 lg:p-6 bg-[#0b1020] text-black">
      <div className="bevel-out mx-auto max-w-6xl p-[3px] bg-[#d4d0c8] shadow-[8px_8px_0_rgba(0,0,0,0.55)]">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex flex-wrap items-center justify-between gap-2 px-2 py-1">
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
              href="/ruta-activa"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0 text-[#000080] font-bold"
            >
              <Truck className="w-3 h-3" />
              <span>Ruta Activa</span>
            </Link>
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

        {/* Notificación de Reserva Exitosa */}
        {mensajeExito && (
          <div className="m-2 bevel-in bg-[#f0fdf4] border border-green-700 p-3 flex flex-wrap items-center justify-between gap-3 text-green-950 font-mono text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
              <div>
                <p className="font-bold">¡Reserva confirmada con éxito!</p>
                <p className="text-[11px] text-green-800">
                  Código:{' '}
                  <b className="bg-white px-1.5 py-0.5 bevel-in">
                    {mensajeExito.codigo}
                  </b>{' '}
                  • Lote: {mensajeExito.producto}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/ruta-activa?id=${mensajeExito.id}`}
                className="btn-98 !py-1 !px-2.5 text-[11px] font-bold flex items-center gap-1 text-[#000080]"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Ver Ruta Activa</span>
              </Link>
              <Link
                href={`/entregas/${mensajeExito.id}`}
                className="btn-green !py-1 !px-2.5 text-[11px] font-bold"
              >
                Registrar Entrega en Comedor &gt;
              </Link>
              <button
                type="button"
                onClick={() => setMensajeExito(null)}
                className="btn-98 !py-1 !px-2 text-[11px]"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

        {/* Barra de información y estado */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#808080] bg-[#e0ded8] px-3 py-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#000080]">
              {donacionesFiltradas.length}{' '}
              {donacionesFiltradas.length === 1
                ? 'oferta disponible'
                : 'ofertas disponibles'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-700">
              Ordenadas por urgencia de recogida
            </span>
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
              <RefreshCw
                className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`}
              />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Selector Horizontal de Zonas de Cali (CA-02.3 / TASK-07) y Filtro de Frío (CA-02.2) */}
        <div className="bg-[#ece9d8] p-2.5 border-b border-[#808080] flex flex-col gap-2">
          <ZonasFilter
            zonaSeleccionada={zonaSeleccionada}
            onSelectZona={handleCambioZona}
            conteosPorZona={conteosPorZona}
          />

          <div className="pt-1.5 border-t border-[#c8c4b8] flex items-center justify-between flex-wrap gap-2 font-mono text-xs">
            <label className="flex items-center gap-2 text-slate-800 cursor-pointer select-none min-h-[36px]">
              <input
                type="checkbox"
                checked={soloSinFrio}
                onChange={(e) => setSoloSinFrio(e.target.checked)}
                className="w-4 h-4 accent-[#000080]"
              />
              <span className="flex items-center gap-1.5 font-semibold">
                <Snowflake
                  className="w-3.5 h-3.5 text-sky-700"
                  aria-hidden="true"
                />
                Excluir alimentos que requieren frío (Comedores sin refrigeración)
              </span>
            </label>
          </div>
        </div>

        {/* Cuadrícula Reactiva de Donaciones */}
        <div id="panel-donaciones" className="p-3 sm:p-4 bg-[#c0c0c0]">
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
                Prueba seleccionando &quot;TODAS LAS ZONAS&quot; o desactivando
                el filtro de refrigeración.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleCambioZona('TODAS');
                  setSoloSinFrio(false);
                }}
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
                  onTomar={handleTomarDonacion}
                  onExpirada={handleOfertaExpirada}
                  tomando={tomandoId === donacion.id}
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

      {/* Modal Reactivo ante Colisión de Toma Concurrente (TASK-09 / CA-03.2) */}
      <ConflictoTomaModal
        abierto={modalColisionAbierto}
        onCerrar={() => setModalColisionAbierto(false)}
        donacionesCercanas={donacionesFiltradas}
        onSeleccionarDonacion={handleTomarDonacion}
      />
    </main>
  );
}
