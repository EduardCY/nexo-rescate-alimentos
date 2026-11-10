'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import {
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { nexoApi } from '@/lib/nexo/api';
import { useNexoOptional } from './NexoContext';
import { useSession } from '@/lib/auth/session-context';
import { eliminarDonacion } from '@/actions/donaciones';
import { eliminarOrganizacion } from '@/actions/organizaciones';
import type { Donacion, ZonaCali } from '@/types';
import type { MapNode } from '@/lib/nexo/impact';

type VistaFiltro = 'CALI_TODO' | ZonaCali | 'REGIONAL';

interface ConfigVista {
  center: [number, number];
  zoom: number;
  label: string;
}

const VISTAS_MAPA: Record<VistaFiltro, ConfigVista> = {
  CALI_TODO: { center: [3.435, -76.525], zoom: 12, label: 'Cali Completa' },
  CENTRO: { center: [3.435, -76.528], zoom: 14, label: 'Centro / Santa Elena' },
  SUR: { center: [3.402, -76.538], zoom: 13, label: 'Sur / Valle del Lili' },
  NORTE: { center: [3.475, -76.515], zoom: 14, label: 'Norte / La Flora' },
  ORIENTE: { center: [3.422, -76.492], zoom: 13, label: 'Oriente / Aguablanca' },
  LADERA: { center: [3.428, -76.56], zoom: 14, label: 'Ladera / Siloé' },
  REGIONAL: { center: [3.415, -76.45], zoom: 11, label: 'Regional (Cavasa/Candelaria)' },
};

const KIND_CONFIG: Record<
  MapNode['kind'],
  { bg: string; border: string; text: string; iconSymbol: string; label: string }
> = {
  donor: {
    bg: '#00c853',
    border: '#00471f',
    text: '#ffffff',
    iconSymbol: '🏪',
    label: 'COMERCIO DONANTE',
  },
  receiver: {
    bg: '#00b0ff',
    border: '#015a88',
    text: '#ffffff',
    iconSymbol: '🥣',
    label: 'COMEDOR RECEPTOR',
  },
  truck: {
    bg: '#ef4444',
    border: '#7f1d1d',
    text: '#ffffff',
    iconSymbol: '🚚',
    label: 'VOLUNTARIO EN RUTA',
  },
  agro: {
    bg: '#f59e0b',
    border: '#78350f',
    text: '#000000',
    iconSymbol: '🏭',
    label: 'CENTRO MAYORISTA / AGRO',
  },
};

/**
 * Mapa SCADA interactivo de Cali motorizado por Leaflet y OpenStreetMap (100% libre de mocks).
 *
 * ¿Por qué?: Permite a los Coordinadores, Voluntarios y Donantes visualizar la ubicación real
 * de los excedentes perecederos y comedores receptores en el territorio urbano de Santiago de Cali.
 */
export default function RadarMap({
  filtroZonaExterna,
  donacionesExternas,
}: {
  filtroZonaExterna?: ZonaCali | 'TODAS';
  donacionesExternas?: Donacion[];
}) {
  const nexoCtx = useNexoOptional();
  const { sesion } = useSession();
  const [nodosLocales, setNodosLocales] = useState<MapNode[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<MapNode | null>(null);
  const [vistaActual, setVistaActual] = useState<VistaFiltro>('CALI_TODO');
  const [eliminandoNodo, setEliminandoNodo] = useState(false);

  const cargarNodosAutonomos = () => {
    nexoApi
      .listMapNodes()
      .then((nodes) => setNodosLocales(nodes))
      .catch(() => {});
  };

  useEffect(() => {
    if (!nexoCtx) {
      cargarNodosAutonomos();
    }
  }, [nexoCtx]);

  const baseMapNodes = nexoCtx?.mapNodes ?? nodosLocales;

  const mapNodes = useMemo(() => {
    if (!donacionesExternas || donacionesExternas.length === 0) {
      return baseMapNodes;
    }

    const ZONAS_FALLBACK: Record<ZonaCali, [number, number]> = {
      CENTRO: [3.435, -76.528],
      SUR: [3.434, -76.538],
      NORTE: [3.475, -76.515],
      ORIENTE: [3.422, -76.492],
      LADERA: [3.428, -76.56],
    };

    const nodosExtra: MapNode[] = donacionesExternas.map((d) => {
      let lat = d.coordenadas?.lat;
      let lng = d.coordenadas?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const fb = ZONAS_FALLBACK[d.zona || 'CENTRO'] || [3.435, -76.528];
        lat = fb[0];
        lng = fb[1];
      }

      return {
        id: `don-${d.id}`,
        kind: 'donor' as const,
        lat,
        lng,
        label: d.codigo ? `${d.codigo}: ${d.tipoAlimento}` : (d.donanteNombre || 'Donante'),
        sub: `${d.cantidadEstimada} ${d.unidadMedida} • ${d.donanteNombre || 'Excedente'}${d.requiereFrio ? ' • ❄️ Frío' : ''}`,
        zona: d.zona || 'CENTRO',
        direccion: d.direccionRecogida,
        alcance: 'URBANO' as const,
        x: 0.5,
        y: 0.5,
      };
    });

    if (nodosExtra.length === 0) return baseMapNodes;
    const idsExistentes = new Set(baseMapNodes.map((n) => n.id));
    const nuevos = nodosExtra.filter((n) => !idsExistentes.has(n.id));
    return [...baseMapNodes, ...nuevos];
  }, [baseMapNodes, donacionesExternas]);

  // Si se pasa un filtro externo (ej. desde el catálogo de donaciones)
  useEffect(() => {
    if (filtroZonaExterna && filtroZonaExterna !== 'TODAS') {
      setVistaActual(filtroZonaExterna);
    } else if (filtroZonaExterna === 'TODAS') {
      setVistaActual('CALI_TODO');
    }
  }, [filtroZonaExterna]);

  // Nodos con coordenadas reales aseguradas
  const nodosFiltrados = useMemo(() => {
    if (vistaActual === 'CALI_TODO') {
      return mapNodes.filter((n) => !n.alcance || n.alcance === 'URBANO');
    }
    if (vistaActual === 'REGIONAL') {
      return mapNodes;
    }
    return mapNodes.filter((n) => n.zona === vistaActual || n.kind === 'truck');
  }, [mapNodes, vistaActual]);

  // Inicialización de Leaflet (SSR-safe)
  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let invalidateTimer: NodeJS.Timeout | null = null;

    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((module) => {
      if (!isMounted || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (module as any).default || module;
      const defaultCfg = VISTAS_MAPA.CALI_TODO;

      const map = L.map(mapContainerRef.current, {
        center: defaultCfg.center,
        zoom: defaultCfg.zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.control
        .attribution({
          position: 'bottomleft',
          prefix:
            '<span style="font-family: monospace; font-size: 10px;">OSM · CartoDB · Nexo Cali</span>',
        })
        .addTo(map);

      mapInstanceRef.current = map;
      setMapaListo(true);

      // Invalida el tamaño inicial después del pintado del DOM para evitar grises/tiles cortados
      invalidateTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      // Observador de cambio de dimensiones para responsive/tabs
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    });

    return () => {
      isMounted = false;
      if (invalidateTimer) clearTimeout(invalidateTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualización de vista (pan & zoom)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapaListo) return;
    const cfg = VISTAS_MAPA[vistaActual];
    mapInstanceRef.current.flyTo(cfg.center, cfg.zoom, { duration: 1.2 });
  }, [vistaActual, mapaListo]);

  // Renderizado reactivo de marcadores SIN rutas ni polilíneas inventadas
  useEffect(() => {
    if (!mapInstanceRef.current || !mapaListo) return;

    let isMounted = true;
    import('leaflet').then((module) => {
      if (!isMounted || !mapInstanceRef.current) return;
      const L = (module as any).default || module;
      const map = mapInstanceRef.current;

      // Limpiar capas previas de marcadores
      map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // Colocación de marcadores dinámicos reales
      nodosFiltrados.forEach((node) => {
        const conf = KIND_CONFIG[node.kind];

        const iconHtml = `
          <div style="
            background-color: ${conf.bg};
            border: 2px solid ${conf.border};
            width: 32px;
            height: 32px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            box-shadow: 2px 2px 0 rgba(0,0,0,0.6);
            cursor: pointer;
            position: relative;
          " class="${node.kind === 'truck' ? 'node-pulse' : ''}">
            <span>${conf.iconSymbol}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'nexo-leaflet-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const popupContent = `
          <div style="font-family: monospace; font-size: 11px; line-height: 1.4; min-width: 190px;">
            <div style="background: ${conf.bg}; color: ${conf.text}; font-weight: bold; padding: 2px 4px; font-size: 10px; margin-bottom: 4px; display: inline-block;">
              ${conf.label}
            </div>
            <div style="font-weight: bold; font-size: 13px; color: #000; margin-bottom: 2px;">
              ${node.label}
            </div>
            ${node.sub ? `<div style="color: #475569; font-size: 11px; margin-bottom: 4px;">${node.sub}</div>` : ''}
            <div style="color: #334155; font-size: 10px; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
              📍 ${node.direccion || 'Ubicación verificada'}
            </div>
            <div style="margin-top: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${node.lat},${node.lng}" target="_blank" rel="noopener noreferrer" style="color: #000080; font-weight: bold; text-decoration: underline; font-size: 10px;">
                Abrir en Google Maps GPS &gt;
              </a>
            </div>
          </div>
        `;

        const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(map);

        marker.bindPopup(popupContent, {
          closeButton: true,
          offset: [0, -10],
        });

        marker.on('click', () => {
          setNodoSeleccionado(node);
        });
      });
    });

    return () => {
      isMounted = false;
    };
  }, [nodosFiltrados, mapaListo]);

  const puedeEliminarNodos =
    sesion?.rol === 'ADMIN' || sesion?.rol === 'COORDINADOR';

  const handleEliminarNodoSeleccionado = async () => {
    if (!nodoSeleccionado || eliminandoNodo) return;
    const confirmacion = window.confirm(
      `¿Confirmas la eliminación del nodo "${nodoSeleccionado.label}" de la base de datos y del mapa?`
    );
    if (!confirmacion) return;

    setEliminandoNodo(true);
    try {
      const rawId = nodoSeleccionado.id;
      if (rawId.startsWith('don-')) {
        const donId = rawId.replace('don-', '');
        await eliminarDonacion(donId, sesion?.rol);
      } else if (rawId.startsWith('org-')) {
        const orgId = rawId.replace('org-', '');
        await eliminarOrganizacion(orgId, sesion?.rol);
      } else {
        await eliminarOrganizacion(rawId, sesion?.rol);
      }

      setNodoSeleccionado(null);
      if (nexoCtx?.refreshData) {
        await nexoCtx.refreshData();
      } else {
        cargarNodosAutonomos();
      }
    } catch {
      alert('No fue posible eliminar el nodo.');
    } finally {
      setEliminandoNodo(false);
    }
  };

  return (
    <section
      aria-label="Mapa cartográfico de operaciones de rescate en Cali"
      className="bevel-out flex flex-col bg-[#d4d0c8] p-[3px] shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
    >
      {/* Barra de herramientas superior */}
      <header className="titlebar flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-white">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wide">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>RADAR CARTOGRÁFICO — SANTIAGO DE CALI</span>
          <span className="bg-emerald-900 text-emerald-300 px-1.5 py-0.2 text-[10px] rounded border border-emerald-500/40">
            {nodosFiltrados.length} NODOS ACTIVOS
          </span>
        </div>

        {/* Selector de Vistas / Zonas */}
        <div className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-black">
          <span className="text-white text-[10px] hidden sm:inline">Sector:</span>
          {(Object.keys(VISTAS_MAPA) as VistaFiltro[]).map((vKey) => (
            <button
              key={vKey}
              type="button"
              onClick={() => setVistaActual(vKey)}
              className={`px-1.5 py-0.5 font-bold transition-all ${
                vistaActual === vKey
                  ? 'bg-[#000080] text-white bevel-in'
                  : 'btn-98 text-slate-800'
              }`}
              title={`Centrar mapa en ${VISTAS_MAPA[vKey].label}`}
            >
              {vKey === 'CALI_TODO' ? 'Cali' : vKey === 'REGIONAL' ? 'Cavasa' : vKey}
            </button>
          ))}
        </div>
      </header>

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative h-[440px] sm:h-[480px] w-full bg-[#0a0f1d] overflow-hidden">
        <div ref={mapContainerRef} className="h-full w-full z-[10]" />

        {/* Indicador de carga */}
        {!mapaListo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070c18] font-mono text-emerald-400 text-xs gap-2 z-[20]">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p>Inicializando visor cartográfico de Santiago de Cali...</p>
          </div>
        )}

        {/* Overlay limpio de Empty State cuando hay 0 nodos */}
        {mapaListo && nodosFiltrados.length === 0 && (
          <div className="pointer-events-none absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-[400] bevel-out bg-[#ffffe1]/95 p-2.5 text-black font-mono text-xs shadow-[3px_3px_0_rgba(0,0,0,0.65)]">
            <p className="font-bold text-[#000080] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Mapa listo — 0 nodos registrados en esta vista</span>
            </p>
            <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
              Registra un comercio donante, un comedor comunitario o publica una donación para visualizar marcadores georreferenciados en tiempo real.
            </p>
          </div>
        )}

        {/* Tarjeta flotante inferior si hay un nodo seleccionado */}
        {nodoSeleccionado && (
          <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-md z-[500] bevel-out p-2.5 text-black font-mono text-xs shadow-[4px_4px_0_rgba(0,0,0,0.7)] bg-[#f5f3e9]">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">
                  {KIND_CONFIG[nodoSeleccionado.kind].iconSymbol}
                </span>
                <b className="text-sm font-bold truncate">
                  {nodoSeleccionado.label}
                </b>
              </div>
              <button
                type="button"
                onClick={() => setNodoSeleccionado(null)}
                className="text-slate-600 hover:text-black font-bold px-1.5 bg-[#e0ded8] bevel-out"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-700 mb-1">
              {nodoSeleccionado.sub} • <b>Dirección:</b> {nodoSeleccionado.direccion || 'Cali'}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#808080] text-[10px]">
              <span className="text-slate-600">
                Sector: <b>{nodoSeleccionado.zona || 'Urbano'}</b>
              </span>
              <div className="flex items-center gap-1.5">
                {puedeEliminarNodos && (
                  <button
                    type="button"
                    disabled={eliminandoNodo}
                    onClick={handleEliminarNodoSeleccionado}
                    className="btn-98 !py-0.5 !px-2 flex items-center gap-1 font-bold text-red-700"
                    title="Eliminar este nodo del sistema y del mapa"
                  >
                    <Trash2 className="w-3 h-3 text-red-700" />
                    <span>{eliminandoNodo ? 'Borrando...' : 'Eliminar'}</span>
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${nodoSeleccionado.lat},${nodoSeleccionado.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-98 !py-0.5 !px-2 flex items-center gap-1 font-bold text-[#000080]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>GPS</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Convención / Leyenda inferior */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 bg-[#0d1424] px-3 py-1.5 font-mono text-[10px] text-slate-300">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#00c853] inline-block border border-[#00471f]" />
            <span>Donante (Galerías)</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#00b0ff] inline-block border border-[#015a88]" />
            <span>Receptor (Comedor)</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#ef4444] inline-block border border-[#7f1d1d]" />
            <span>Voluntario en Ruta</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#f59e0b] inline-block border border-[#78350f]" />
            <span>Mayorista (Cavasa)</span>
          </li>
        </ul>
        <div className="text-slate-400">
          Cali Metropolitana · Datos 100% Reales
        </div>
      </footer>
    </section>
  );
}
