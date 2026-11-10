'use client';

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  Snowflake,
  MapPin,
  Clock,
  Utensils,
} from 'lucide-react';
import type { Donacion, ZonaFiltro } from '@/types';
import {
  obtenerDonacionesDisponibles,
  obtenerDonacionesExpiradas,
  tomarDonacion,
  marcarDonacionExpirada,
  asignarDonacionAComedor,
} from '@/actions/donaciones';
import { listarOrganizaciones, type OrganizacionRegistrada } from '@/actions/organizaciones';
import dynamic from 'next/dynamic';
import { filtrarDonacionesDisponibles } from '@/lib/utils/donaciones-helper';
import { DonacionCard } from '@/components/donaciones/DonacionCard';
import { ZonasFilter } from '@/components/donaciones/ZonasFilter';
import { ConflictoTomaModal } from '@/components/donaciones/ConflictoTomaModal';
import { useSession } from '@/lib/auth/session-context';
import { useRouter } from 'next/navigation';
import { eliminarDonacion } from '@/actions/donaciones';

// Carga dinámica segura de RadarMap con Leaflet sin renderizado en servidor (SSR)
const RadarMap = dynamic(() => import('@/components/nexo/RadarMap'), {
  ssr: false,
  loading: () => (
    <div className="bevel-in bg-[#070c18] p-6 text-center text-white font-mono text-xs border border-slate-700">
      <div className="inline-block animate-spin mr-2">⏳</div>
      <span>Cargando mapa interactivo OpenStreetMap ($0 USD/mes)...</span>
    </div>
  ),
});

/**
 * Catálogo reactivo de donaciones disponibles (CMP-02 / TASK-06, TASK-07, TASK-16, TASK-17, TASK-19)
 * con filtro determinístico por zonas de Cali, filtro de cadena de frío, mapa interactivo
 * OpenStreetMap integrado, vista de auditoría de Donaciones Expiradas para ADMIN y COORDINADOR,
 * y manejo de colisión de toma concurrente HTTP 409 (CMP-03 / TASK-09).
 */
export default function CatalogoDonacionesPage() {
  const { sesion } = useSession();

  const [donaciones, setDonaciones] = useState<Donacion[]>([]);
  const [donacionesExpiradas, setDonacionesExpiradas] = useState<Donacion[]>([]);
  const [comedores, setComedores] = useState<OrganizacionRegistrada[]>([]);
  const [comedorSeleccionadoPorDonacion, setComedorSeleccionadoPorDonacion] = useState<Record<string, string>>({});
  const [vistaCatalogo, setVistaCatalogo] = useState<'vigentes' | 'expiradas'>('vigentes');
  const [cargando, setCargando] = useState(true);
  const [tomandoId, setTomandoId] = useState<string | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaFiltro>('TODAS');
  const [soloSinFrio, setSoloSinFrio] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [modalColisionAbierto, setModalColisionAbierto] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<{
    id: string;
    codigo: string;
    producto: string;
    comedorNombre?: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const esSupervisor =
    Boolean(sesion && (sesion.rol === 'ADMIN' || sesion.rol === 'COORDINADOR'));
  const puedePublicar =
    Boolean(sesion && (sesion.rol === 'DONANTE' || sesion.rol === 'ADMIN' || sesion.rol === 'COORDINADOR'));
  const puedeVerRutaActiva =
    Boolean(
      sesion &&
        (sesion.rol === 'VOLUNTARIO' ||
          sesion.rol === 'RECEPTOR' ||
          sesion.rol === 'COORDINADOR' ||
          sesion.rol === 'ADMIN')
    );

  const cargarOfertas = useCallback(async () => {
    setCargando(true);
    try {
      const [vigentes, expiradas, listaComedores] = await Promise.all([
        obtenerDonacionesDisponibles('TODAS'),
        obtenerDonacionesExpiradas(),
        listarOrganizaciones('RECEPTOR'),
      ]);
      setDonaciones(vigentes);
      setDonacionesExpiradas(expiradas);
      setComedores(listaComedores);
    } catch {
      // Fallback seguro
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarOfertas();
  }, [cargarOfertas]);

  // Cambio reactivo de zona (< 100 ms DoD)
  const handleCambioZona = (nuevaZona: ZonaFiltro) => {
    startTransition(() => {
      setZonaSeleccionada(nuevaZona);
    });
  };

  // Conteos reactivos por zona para ZonasFilter (TASK-07 / TASK-17)
  const conteosPorZona = useMemo<Record<ZonaFiltro, number>>(() => {
    const conteos: Record<ZonaFiltro, number> = {
      TODAS: 0,
      NORTE: 0,
      CENTRO: 0,
      SUR: 0,
      ORIENTE: 0,
      LADERA: 0,
    };

    const vigentes = filtrarDonacionesDisponibles(donaciones, { soloSinFrio });
    for (const d of vigentes) {
      conteos.TODAS += 1;
      if (d.zona && conteos[d.zona] !== undefined) {
        conteos[d.zona] += 1;
      }
    }

    return conteos;
  }, [donaciones, soloSinFrio]);

  // Filtrado y ordenamiento determinístico mediante el helper unificado (TASK-17 / CA-02.1..CA-02.4)
  const donacionesFiltradas = useMemo(() => {
    return filtrarDonacionesDisponibles(donaciones, {
      zona: zonaSeleccionada,
      soloSinFrio,
    });
  }, [donaciones, zonaSeleccionada, soloSinFrio]);

  const expiradasFiltradas = useMemo(() => {
    return donacionesExpiradas.filter((d) => {
      if (zonaSeleccionada !== 'TODAS' && d.zona !== zonaSeleccionada) return false;
      if (soloSinFrio && d.requiereFrio) return false;
      return true;
    });
  }, [donacionesExpiradas, zonaSeleccionada, soloSinFrio]);

  // Manejador cuando una oferta expira en vivo (CA-02.4 / CA-03.3 / TASK-16)
  const handleOfertaExpirada = async (id: string) => {
    setDonaciones((prev) => prev.filter((d) => d.id !== id));
    await marcarDonacionExpirada(id);
    const exp = await obtenerDonacionesExpiradas();
    setDonacionesExpiradas(exp);
  };

  // Asignación previa de Comedor Comunitario (para COORDINADOR / ADMIN)
  const handlePreasignarComedor = async (donacion: Donacion, comedorId: string) => {
    setComedorSeleccionadoPorDonacion((prev) => ({ ...prev, [donacion.id]: comedorId }));
    const com = comedores.find((c) => c.id === comedorId);
    if (!com) return;

    const res = await asignarDonacionAComedor({
      donacionId: donacion.id,
      comedorId: com.id,
      comedorNombre: com.nombre,
      comedorTieneFrio: Boolean(com.tieneRefrigeracion),
    });

    if (res.exito) {
      setDonaciones((prev) =>
        prev.map((d) =>
          d.id === donacion.id
            ? { ...d, comedorId: com.id, comedorNombre: com.nombre }
            : d
        )
      );
      setErrorAccion(null);
    } else {
      setErrorAccion(res.error);
    }
  };

  // Acción de reserva con captura de colisión concurrente HTTP 409 (TASK-09)
  const handleTomarDonacion = async (id: string) => {
    if (tomandoId) return;
    setTomandoId(id);
    setMensajeExito(null);
    setErrorAccion(null);

    try {
      const esReceptor = sesion?.rol === 'RECEPTOR';
      const comId = comedorSeleccionadoPorDonacion[id];
      const comObj = comedores.find((c) => c.id === comId);

      const comedorDestinoParam = esReceptor
        ? {
            comedorId: sesion?.organizacionId,
            comedorNombre: sesion?.organizacionNombre || sesion?.nombre,
            comedorTieneFrio: Boolean(sesion?.tieneRefrigeracion),
            esRecogidaPropiaComedor: true,
          }
        : comObj
        ? {
            comedorId: comObj.id,
            comedorNombre: comObj.nombre,
            comedorTieneFrio: Boolean(comObj.tieneRefrigeracion),
          }
        : undefined;

      const res = await tomarDonacion(
        id,
        sesion?.userId,
        sesion?.nombre,
        undefined,
        comedorDestinoParam
      );

      if (res.exito && res.codigo === 200) {
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
        setMensajeExito({
          id: res.donacion.id,
          codigo: res.donacion.codigo,
          producto: `${res.donacion.tipoAlimento} (${res.donacion.cantidadEstimada} ${res.donacion.unidadMedida})`,
          comedorNombre: res.donacion.comedorNombre,
        });
      } else if (res.codigo === 409) {
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
        setModalColisionAbierto(true);
      } else if (res.codigo === 410) {
        setDonaciones((prev) => prev.filter((d) => d.id !== id));
      } else if (!res.exito) {
        setErrorAccion(res.mensaje);
      }
    } catch {
      // Manejo seguro
    } finally {
      setTomandoId(null);
    }
  };

  const listaActiva = vistaCatalogo === 'vigentes' ? donacionesFiltradas : expiradasFiltradas;

  return (
    <main className="min-h-screen p-2 sm:p-4 lg:p-6 bg-[#0b1020] text-black">
      <div className="bevel-out mx-auto max-w-6xl p-[3px] bg-[#d4d0c8] shadow-[8px_8px_0_rgba(0,0,0,0.55)]">
        {/* Barra de título Windows 98 adaptada al Rol */}
        <header className="titlebar flex flex-wrap items-center justify-between gap-2 px-2 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 bg-white text-black font-extrabold text-[10px] flex items-center justify-center">
              ■
            </span>
            <h1 className="truncate font-mono text-xs sm:text-[13px] font-bold text-white tracking-wide">
              CATÁLOGO DE DONACIONES ACTIVAS — SANTIAGO DE CALI
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puedeVerRutaActiva && (
              <Link
                href="/ruta-activa"
                className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0 text-[#000080] font-bold"
              >
                <Truck className="w-3 h-3" />
                <span>Ruta Activa</span>
              </Link>
            )}
            {puedePublicar && (
              <Link
                href="/donar"
                className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0 text-[#000080] font-bold"
              >
                <span>+ Publicar Donación</span>
              </Link>
            )}
            <Link
              href="/"
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Mi Portal ({sesion?.rol || 'Inicio'})</span>
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
                  {mensajeExito.comedorNombre ? ` • Destino: ${mensajeExito.comedorNombre}` : ''}
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

        {errorAccion && (
          <div className="m-2 bevel-in bg-red-100 border border-red-600 p-2.5 text-red-900 font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorAccion}</span>
          </div>
        )}

        {/* Barra de información, estado y Pestaña de Expiradas para ADMIN y COORDINADOR */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#808080] bg-[#e0ded8] px-3 py-2 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {esSupervisor ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVistaCatalogo('vigentes')}
                  className={`px-2.5 py-1 font-bold text-[11px] ${
                    vistaCatalogo === 'vigentes'
                      ? 'bg-[#000080] text-white bevel-in'
                      : 'btn-98 text-black'
                  }`}
                >
                  Ofertas Vigentes ({donacionesFiltradas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVistaCatalogo('expiradas')}
                  className={`px-2.5 py-1 font-bold text-[11px] flex items-center gap-1 ${
                    vistaCatalogo === 'expiradas'
                      ? 'bg-red-800 text-white bevel-in'
                      : 'btn-98 text-red-900'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Donaciones Expiradas / Histórico ({expiradasFiltradas.length})</span>
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostrarMapa(!mostrarMapa)}
              className={`btn-98 !py-0.5 !px-2 text-[11px] flex items-center gap-1 font-bold ${
                mostrarMapa ? 'bg-[#000080] text-white' : 'text-[#000080]'
              }`}
              title="Alternar vista de mapa cartográfico"
            >
              <MapPin className="w-3 h-3" />
              <span>{mostrarMapa ? 'Ocultar Mapa' : 'Ver Mapa en Vivo'}</span>
            </button>
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

        {/* Mapa Cartográfico Interactivo Plegable (TASK-19 / CMP-02) */}
        {mostrarMapa && (
          <div className="p-2 sm:p-3 bg-[#070c18] border-b border-[#808080]">
            <RadarMap
              filtroZonaExterna={zonaSeleccionada}
              donacionesExternas={donacionesFiltradas}
            />
          </div>
        )}

        {/* Cuadrícula Reactiva de Donaciones */}
        <div id="panel-donaciones" className="p-3 sm:p-4 bg-[#c0c0c0]">
          {cargando ? (
            <div className="bevel-in bg-white p-8 text-center font-mono text-xs text-slate-700">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[#000080]" />
              <p>Consultando ofertas en la red de Cali...</p>
            </div>
          ) : listaActiva.length === 0 ? (
            <div className="bevel-in bg-[#ffffe1] p-8 text-center font-mono text-xs text-slate-800 max-w-md mx-auto">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-700" />
              <p className="font-bold text-sm mb-1">
                {vistaCatalogo === 'expiradas'
                  ? `No hay donaciones expiradas registradas en la zona ${zonaSeleccionada}.`
                  : `No hay donaciones activas en la zona ${zonaSeleccionada}.`}
              </p>
              <p className="text-[11px] text-slate-600 mb-4">
                {vistaCatalogo === 'expiradas'
                  ? 'Las ofertas cuya hora límite caduque sin haber sido tomadas aparecerán aquí para auditoría.'
                  : 'Prueba seleccionando "TODAS LAS ZONAS", desactivando el filtro de refrigeración o publicando una nueva donación.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
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
                {puedePublicar && vistaCatalogo === 'vigentes' && (
                  <Link href="/donar" className="btn-green min-h-[40px] px-4 font-bold flex items-center">
                    + Publicar Donación
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {listaActiva.map((donacion) => {
                const comedoresAptos = comedores.filter(
                  (c) => !donacion.requiereFrio || Boolean(c.tieneRefrigeracion)
                );

                return (
                  <DonacionCard
                    key={donacion.id}
                    donacion={donacion}
                    onTomar={handleTomarDonacion}
                    onExpirada={handleOfertaExpirada}
                    tomando={tomandoId === donacion.id}
                    mostrarExpirada={vistaCatalogo === 'expiradas'}
                    textoBotonTomar={
                      sesion?.rol === 'RECEPTOR'
                        ? 'RECOGIDA CON TRANSPORTE PROPIO'
                        : 'TOMAR DONACIÓN'
                    }
                    ocultarBotonTomar={
                      vistaCatalogo === 'expiradas' ||
                      sesion?.rol === 'DONANTE' ||
                      sesion?.rol === 'COORDINADOR' ||
                      sesion?.rol === 'ADMIN' ||
                      !sesion
                    }
                    accionExtra={
                      esSupervisor && vistaCatalogo === 'vigentes' && comedoresAptos.length > 0 ? (
                        <div className="font-mono text-[11px] bg-white p-1.5 bevel-in">
                          <label
                            htmlFor={`sel-com-${donacion.id}`}
                            className="flex items-center gap-1 font-bold text-[#000080] mb-1"
                          >
                            <Utensils className="w-3 h-3" />
                            <span>Comedor Comunitario Destino:</span>
                          </label>
                          <select
                            id={`sel-com-${donacion.id}`}
                            value={
                              comedorSeleccionadoPorDonacion[donacion.id] ||
                              donacion.comedorId ||
                              ''
                            }
                            onChange={(e) =>
                              handlePreasignarComedor(donacion, e.target.value)
                            }
                            className="retro-field !py-1 text-[11px]"
                          >
                            <option value="">Seleccionar comedor compatible...</option>
                            {comedoresAptos.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} (Zona {c.zona})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Barra de pie de página */}
        <footer className="flex items-center justify-between gap-1 p-1 text-[11px] text-black font-mono bg-[#d4d0c8]">
          <div className="bevel-in flex-1 px-2 py-0.5 truncate">
            Red de Rescate de Alimentos • Cali, Colombia • Ley 1990 de 2019
          </div>
          <div className="bevel-in px-2 py-0.5 hidden sm:block">
            Catálogo en Tiempo Real
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
