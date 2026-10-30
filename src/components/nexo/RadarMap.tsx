'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type L from 'leaflet';
import { useNexoOptional } from './NexoContext';
import { nexoApi } from '@/lib/nexo/api';
import type { MapNode, MapNodeKind } from '@/lib/nexo/impact';
import type { Donacion, ZonaCali } from '@/types';
import {
  MapPin,
  Truck,
  ExternalLink,
  Layers,
  Compass,
} from 'lucide-react';

const KIND_CONFIG: Record<
  MapNodeKind,
  { label: string; bg: string; border: string; text: string; iconSymbol: string }
> = {
  donor: {
    label: 'DONANTE',
    bg: '#00c853',
    border: '#00471f',
    text: '#00130a',
    iconSymbol: '📦',
  },
  receiver: {
    label: 'COMEDOR RECEPTOR',
    bg: '#00b0ff',
    border: '#015a88',
    text: '#001f3f',
    iconSymbol: '🍲',
  },
  agro: {
    label: 'CENTRAL MAYORISTA',
    bg: '#f59e0b',
    border: '#78350f',
    text: '#261200',
    iconSymbol: '🌾',
  },
  truck: {
    label: 'VOLUNTARIO EN RUTA',
    bg: '#ef4444',
    border: '#7f1d1d',
    text: '#ffffff',
    iconSymbol: '🚚',
  },
};

type VistaFiltro = 'CALI_TODO' | ZonaCali | 'REGIONAL';

interface VistaConfig {
  label: string;
  center: [number, number];
  zoom: number;
}

const VISTAS_MAPA: Record<VistaFiltro, VistaConfig> = {
  CALI_TODO: {
    label: 'Cali (Todo)',
    center: [3.435, -76.53],
    zoom: 12.5,
  },
  CENTRO: {
    label: 'Centro',
    center: [3.435, -76.528],
    zoom: 14.5,
  },
  SUR: {
    label: 'Sur',
    center: [3.4, -76.538],
    zoom: 14,
  },
  LADERA: {
    label: 'Ladera',
    center: [3.428, -76.56],
    zoom: 14,
  },
  ORIENTE: {
    label: 'Oriente',
    center: [3.422, -76.492],
    zoom: 13.5,
  },
  NORTE: {
    label: 'Norte',
    center: [3.475, -76.515],
    zoom: 13.5,
  },
  REGIONAL: {
    label: 'Corredor Valle (Cavasa)',
    center: [3.422, -76.475],
    zoom: 11.5,
  },
};

export default function RadarMap({
  filtroZonaExterna,
  donacionesExternas,
}: {
  filtroZonaExterna?: ZonaCali | 'TODAS';
  donacionesExternas?: Donacion[];
}) {
  const nexoCtx = useNexoOptional();
  const [nodosLocales, setNodosLocales] = useState<MapNode[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [nodoSeleccionado, setNodoSeleccionado] = useState<MapNode | null>(null);
  const [vistaActual, setVistaActual] = useState<VistaFiltro>('CALI_TODO');

  // Si no está dentro de NexoProvider, cargar nodos autónomamente
  useEffect(() => {
    if (!nexoCtx) {
      nexoApi
        .listMapNodes()
        .then((nodes) => setNodosLocales(nodes))
        .catch(() => {});
    }
  }, [nexoCtx]);

  const baseMapNodes = nexoCtx?.mapNodes ?? nodosLocales;

  // Si se reciben donaciones del catálogo con coordenadas, incorporarlas como pines donantes
  const mapNodes = useMemo(() => {
    if (!donacionesExternas || donacionesExternas.length === 0) {
      return baseMapNodes;
    }

    const nodosExtra: MapNode[] = donacionesExternas
      .filter((d) => d.coordenadas && typeof d.coordenadas.lat === 'number' && typeof d.coordenadas.lng === 'number')
      .map((d) => ({
        id: `don-${d.id}`,
        kind: 'donor' as const,
        lat: d.coordenadas!.lat,
        lng: d.coordenadas!.lng,
        label: d.donanteNombre || 'Donante',
        sub: `${d.cantidadEstimada} ${d.unidadMedida} • ${d.tipoAlimento}`,
        zona: d.zona || 'CENTRO',
        direccion: d.direccionRecogida,
        alcance: 'URBANO' as const,
        x: 0.5,
        y: 0.5,
      }));

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
      return mapNodes; // Todos, incluyendo Cavasa / Candelaria / Intermunicipal
    }
    // Filtrar por zona de Cali
    return mapNodes.filter((n) => n.zona === vistaActual || n.kind === 'truck');
  }, [mapNodes, vistaActual]);

  // Inicialización segura de Leaflet en el cliente (SSR-safe)
  useEffect(() => {
    let isMounted = true;

    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Importación dinámica para Next.js App Router
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Limpiar instancia previa si existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const cfg = VISTAS_MAPA.CALI_TODO;
      const map = L.map(mapContainerRef.current, {
        center: cfg.center,
        zoom: cfg.zoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Teselas gratuitas y ligeras de OpenStreetMap ($0 USD/mes - RNF-005)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 9,
      }).addTo(map);

      // Control de zoom en esquina superior derecha con estética táctil
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      setMapaListo(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualización de vista (pan & zoom) cuando cambia la vista seleccionada
  useEffect(() => {
    if (!mapInstanceRef.current || !mapaListo) return;
    const cfg = VISTAS_MAPA[vistaActual];
    mapInstanceRef.current.flyTo(cfg.center, cfg.zoom, { duration: 1.2 });
  }, [vistaActual, mapaListo]);

  // Renderizado reactivo de marcadores y ruta activa sobre el mapa Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !mapaListo) return;

    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // Limpiar capas previas de marcadores y polilíneas
      map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // 1. Trazado de ruta activa (Santa Elena -> Voluntario -> Siloé)
      const rutaNodos = mapNodes.filter(
        (n) => n.id === 'node-1' || n.id === 'node-5' || n.id === 'node-3'
      );
      if (rutaNodos.length >= 2) {
        const coordsRuta: [number, number][] = [
          [3.4258, -76.5244], // Santa Elena
          [3.4315, -76.541],  // Voluntario en Calle 5ta
          [3.4285, -76.5572], // Comedor Siloé
        ];

        L.polyline(coordsRuta, {
          color: '#00e676',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '6, 6',
        }).addTo(map);
      }

      // 2. Colocación de marcadores personalizados sin solapamiento
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
            <div style="border-top: 1px dotted #808080; padding-top: 4px; margin-top: 4px; color: #1e293b; font-size: 10px;">
              📍 ${node.direccion || 'Santiago de Cali'}
              <br/>
              <b>Sector:</b> ${node.zona || 'Urbano'} • <b>Ciudad:</b> ${node.municipio || 'Cali'}
            </div>
            <div style="margin-top: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${node.lat},${node.lng}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 style="display: inline-block; background: #000080; color: #fff; text-decoration: none; padding: 3px 6px; font-weight: bold; font-size: 10px; box-shadow: inset -1px -1px #000, inset 1px 1px #fff;">
                Cómo llegar ↗
              </a>
            </div>
          </div>
        `;

        const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setNodoSeleccionado(node);
        });
      });
    });

    return () => {
      isMounted = false;
    };
  }, [nodosFiltrados, mapaListo, mapNodes]);

  const centrarRutaVoluntario = () => {
    if (!mapInstanceRef.current) return;
    const camion = mapNodes.find((n) => n.kind === 'truck');
    if (camion) {
      mapInstanceRef.current.flyTo([camion.lat, camion.lng], 15, { duration: 1 });
      setNodoSeleccionado(camion);
    } else {
      mapInstanceRef.current.flyTo([3.435, -76.53], 13, { duration: 1 });
    }
  };

  return (
    <section
      className="scada-panel flex flex-col overflow-hidden bevel-in-dark"
      aria-label="Mapa cartográfico logístico de Cali y corredores metropolitanos"
    >
      {/* Barra de título con identidad SCADA / Windows 98 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-[#0d1424] px-3 py-1.5 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-nexo-phosphor inline-block" />
          <h2 className="text-xs font-bold tracking-widest text-nexo-phosphor">
            MAPA CARTOGRÁFICO LOGÍSTICO — OPENSTREETMAP
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-300">
          <span className="bg-[#122240] px-2 py-0.5 border border-slate-600 text-nexo-cyan font-bold">
            {nodosFiltrados.length} NODOS ACTIVOS
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-green-400 font-bold">$0 USD/mes (OpenStreetMap)</span>
        </div>
      </div>

      {/* Selector de Escala Geográfica: Urbano Cali -> Corredor Regional (TASK-19) */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-[#070c18] p-1.5 border-b border-slate-800 font-mono text-[11px]">
        <span className="text-slate-400 text-[10px] px-1 flex items-center gap-1 shrink-0">
          <Layers className="w-3 h-3 text-nexo-phosphor" /> Escala:
        </span>
        {(Object.keys(VISTAS_MAPA) as VistaFiltro[]).map((vKey) => {
          const cfg = VISTAS_MAPA[vKey];
          const activo = vistaActual === vKey;
          return (
            <button
              key={vKey}
              type="button"
              onClick={() => setVistaActual(vKey)}
              className={`px-2.5 py-1 text-[10px] font-bold shrink-0 transition-colors ${
                activo
                  ? 'bg-nexo-phosphor text-black font-extrabold shadow-[1px_1px_0_#fff]'
                  : 'bg-[#15203b] text-slate-300 hover:bg-[#1e2f57]'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={centrarRutaVoluntario}
          className="ml-auto btn-98 !py-0.5 !px-2 text-[10px] font-mono flex items-center gap-1 shrink-0 text-[#000080]"
          title="Centrar en el voluntario en ruta"
        >
          <Compass className="w-3 h-3 text-[#000080]" />
          <span>Centrar Voluntario</span>
        </button>
      </div>

      {/* Contenedor del Mapa Cartográfico */}
      <div className="relative w-full h-[360px] sm:h-[400px] bg-[#0b1020]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Fallback de carga / sin conexión */}
        {!mapaListo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070c18] p-4 text-center font-mono text-xs text-slate-300">
            <Compass className="w-8 h-8 mb-2 animate-spin text-nexo-phosphor" />
            <p className="font-bold">Cargando cartografía OpenStreetMap de Cali...</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Georreferenciando puntos de donación, centros de acopio y comedores.
            </p>
          </div>
        )}

        {/* Tarjeta flotante inferior si hay un nodo seleccionado */}
        {nodoSeleccionado && (
          <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-md z-[500] bevel-out p-2.5 text-black font-mono text-xs shadow-[4px_4px_0_rgba(0,0,0,0.7)]">
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
              {nodoSeleccionado.sub} • <b>Dirección:</b> {nodoSeleccionado.direccion}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#808080] text-[10px]">
              <span className="text-slate-600">
                Sector: <b>{nodoSeleccionado.zona || 'Urbano'}</b> ({nodoSeleccionado.municipio || 'Cali'})
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${nodoSeleccionado.lat},${nodoSeleccionado.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-98 !py-0.5 !px-2 flex items-center gap-1 font-bold text-[#000080]"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Navegar GPS</span>
              </a>
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
            <span className="w-2.5 h-2.5 bg-[#ef4444] inline-block border border-[#7f1d1d]" />
            <span>En ruta (Voluntario)</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#f59e0b] inline-block border border-[#78350f]" />
            <span>Mayorista (Cavasa)</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#00b0ff] inline-block border border-[#015a88]" />
            <span>Receptor (Comedor)</span>
          </li>
        </ul>
        <div className="text-slate-400">
          Escalable: Cali Urbana ➔ Corredor Intermunicipal Valle
        </div>
      </footer>
    </section>
  );
}
