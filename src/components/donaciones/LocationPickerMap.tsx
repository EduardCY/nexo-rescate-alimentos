'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import type { ZonaCali } from '@/types';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { inferirZonaCali } from '@/lib/utils/donaciones-helper';

export interface LocationCoords {
  lat: number;
  lng: number;
}

interface LocationPreset {
  nombre: string;
  direccion: string;
  zona: ZonaCali;
  coords: [number, number];
}

const PRESETS_CALI: LocationPreset[] = [
  {
    nombre: 'Galería Santa Elena',
    direccion: 'Carrera 29 con Calle 25, Galería Santa Elena',
    zona: 'CENTRO',
    coords: [3.435, -76.528],
  },
  {
    nombre: 'Plaza Alameda',
    direccion: 'Calle 8 con Carrera 26, Galería Alameda',
    zona: 'SUR',
    coords: [3.434, -76.538],
  },
  {
    nombre: 'Cavasa Mayorista',
    direccion: 'Km 11 Vía Cali - Candelaria, Central Mayorista Cavasa',
    zona: 'ORIENTE',
    coords: [3.422, -76.475],
  },
  {
    nombre: 'La Flora / Avenida 3N',
    direccion: 'Avenida 3 Norte # 52N-40, La Flora',
    zona: 'NORTE',
    coords: [3.475, -76.515],
  },
  {
    nombre: 'Siloé / Estación MIO',
    direccion: 'Calle 1 Oeste # 50-12, Sector La Nave, Siloé',
    zona: 'LADERA',
    coords: [3.428, -76.56],
  },
];

const ZONAS_CENTROS: Record<ZonaCali, [number, number]> = {
  CENTRO: [3.435, -76.528],
  SUR: [3.434, -76.538],
  NORTE: [3.475, -76.515],
  ORIENTE: [3.422, -76.492],
  LADERA: [3.428, -76.56],
};

interface Props {
  coordenadas: LocationCoords | null;
  onLocationSelect: (
    coords: LocationCoords,
    direccionSugerida?: string,
    zonaSugerida?: ZonaCali
  ) => void;
  zonaActual: ZonaCali;
}

export function LocationPickerMap({
  coordenadas,
  onLocationSelect,
  zonaActual,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletModuleRef = useRef<typeof L | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [gpsBuscando, setGpsBuscando] = useState(false);
  const [gpsMensaje, setGpsMensaje] = useState<string | null>(null);
  const [coordsActuales, setCoordsActuales] = useState<LocationCoords>(
    coordenadas || { lat: 3.435, lng: -76.528 }
  );

  // Inicializar Leaflet (SSR-safe con importación dinámica)
  useEffect(() => {
    let activo = true;

    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((L) => {
      if (!activo || !mapContainerRef.current) return;
      leafletModuleRef.current = L;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const initialCenter: [number, number] = coordenadas
        ? [coordenadas.lat, coordenadas.lng]
        : ZONAS_CENTROS[zonaActual] || [3.435, -76.528];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 10,
      }).addTo(map);

      // Icono de pin táctil visible estilo Windows 98 / SCADA
      const pinIcon = L.divIcon({
        className: 'location-picker-pin',
        html: `
          <div style="
            background-color: #00c853;
            border: 2px solid #00471f;
            color: #00130a;
            width: 34px;
            height: 34px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 2px 2px 0 rgba(0,0,0,0.65);
            font-family: monospace;
            cursor: grab;
          ">
            <span>📍</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32],
      });

      const marker = L.marker(initialCenter, {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; padding: 2px;">
          <b>PUNTO DE RECOGIDA</b><br/>
          Lat: ${initialCenter[0].toFixed(4)}<br/>
          Lng: ${initialCenter[1].toFixed(4)}
        </div>
      `);

      markerRef.current = marker;

      // Evento de clic en cualquier lugar del mapa
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(5));
        const lng = Number(e.latlng.lng.toFixed(5));
        const newCoords: LocationCoords = { lat, lng };

        marker.setLatLng([lat, lng]);
        marker.setPopupContent(`
          <div style="font-family: monospace; font-size: 11px; padding: 2px;">
            <b>PUNTO DE RECOGIDA</b><br/>
            Lat: ${lat}<br/>
            Lng: ${lng}
          </div>
        `);
        setCoordsActuales(newCoords);

        // Estimar zona según coordenadas relativas de Cali
        const zonaEstimada = estimarZonaPorCoords(lat, lng);
        onLocationSelect(newCoords, undefined, zonaEstimada);
      });

      // Evento de arrastre de marcador
      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        const lat = Number(latLng.lat.toFixed(5));
        const lng = Number(latLng.lng.toFixed(5));
        const newCoords: LocationCoords = { lat, lng };

        setCoordsActuales(newCoords);
        const zonaEstimada = estimarZonaPorCoords(lat, lng);
        onLocationSelect(newCoords, undefined, zonaEstimada);
      });

      mapRef.current = map;
      setMapaListo(true);
    });

    return () => {
      activo = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Actualizar centro cuando cambia la zona desde el selector exterior
  useEffect(() => {
    if (!mapRef.current || !mapaListo) return;
    const centro = ZONAS_CENTROS[zonaActual];
    if (centro) {
      mapRef.current.flyTo(centro, 14, { duration: 0.8 });
    }
  }, [zonaActual, mapaListo]);

  // Selección de preset
  const aplicarPreset = (p: LocationPreset) => {
    const coords: LocationCoords = { lat: p.coords[0], lng: p.coords[1] };
    setCoordsActuales(coords);
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo(p.coords, 15, { duration: 0.8 });
      markerRef.current.setLatLng(p.coords);
    }
    onLocationSelect(coords, p.direccion, p.zona);
  };

  // Botón de geolocalización GPS
  const handleUsarGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsMensaje('Geolocalización no soportada por el navegador.');
      return;
    }

    setGpsBuscando(true);
    setGpsMensaje(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBuscando(false);
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const newCoords: LocationCoords = { lat, lng };

        setCoordsActuales(newCoords);
        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { duration: 1.0 });
          markerRef.current.setLatLng([lat, lng]);
        }

        const zonaEstimada = estimarZonaPorCoords(lat, lng);
        setGpsMensaje(`GPS detectado: [${lat}, ${lng}]`);
        onLocationSelect(newCoords, undefined, zonaEstimada);
      },
      (err) => {
        setGpsBuscando(false);
        setGpsMensaje(`GPS no disponible (${err.message}). Puedes hacer clic en el mapa.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Botones de Presets Rápidos de Cali */}
      <div>
        <label className="retro-label">
          Centros de acopio y plazas frecuentes (1 toque):
        </label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {PRESETS_CALI.map((p) => {
            const activo =
              Math.abs(coordsActuales.lat - p.coords[0]) < 0.005 &&
              Math.abs(coordsActuales.lng - p.coords[1]) < 0.005;

            return (
              <button
                key={p.nombre}
                type="button"
                onClick={() => aplicarPreset(p)}
                className={`min-h-[36px] px-2.5 py-1 text-[11px] font-mono flex items-center gap-1 ${
                  activo ? 'bg-[#000080] text-white bevel-in font-bold' : 'btn-98 text-black'
                }`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{p.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Controles sobre el Mapa: GPS y Coordenadas */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#d4d0c8] p-1.5 border border-[#808080] font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUsarGps}
            disabled={gpsBuscando}
            className="btn-98 min-h-[34px] !py-0.5 !px-2.5 text-[11px] font-bold flex items-center gap-1 text-[#000080]"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsBuscando ? 'animate-spin' : ''}`} />
            <span>{gpsBuscando ? 'Detectando GPS...' : 'Usar mi ubicación GPS actual'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-800">
          <Compass className="w-3.5 h-3.5 text-[#000080]" />
          <span>
            <b>Lat:</b> {coordsActuales.lat.toFixed(4)} | <b>Lng:</b> {coordsActuales.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {gpsMensaje && (
        <div className="bevel-in bg-[#f0f9ff] border border-sky-600 p-1.5 text-sky-950 font-mono text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>{gpsMensaje}</span>
        </div>
      )}

      {/* Contenedor del Mapa Interactivo Leaflet */}
      <div className="relative border-2 border-[#808080] bevel-in bg-[#070c18] overflow-hidden">
        <div
          ref={mapContainerRef}
          className="w-full h-[220px] sm:h-[260px] z-0"
          style={{ cursor: 'crosshair' }}
        />
        <div className="absolute bottom-1 left-1 right-1 bg-black/80 text-white font-mono text-[10px] px-2 py-0.5 pointer-events-none flex items-center justify-between z-[400]">
          <span>📍 Haz clic en el mapa o arrastra el pin para fijar el punto de recogida</span>
          <span className="text-emerald-400 font-bold">OpenStreetMap ($0 USD)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Función auxiliar para estimar la zona de Cali según latitud y longitud.
 */
function estimarZonaPorCoords(lat: number, lng: number): ZonaCali {
  // Coordenadas centro de Cali aprox: 3.435, -76.528
  if (lat > 3.46) return 'NORTE';
  if (lng < -76.55) return 'LADERA';
  if (lng > -76.50) return 'ORIENTE';
  if (lat < 3.42) return 'SUR';
  return 'CENTRO';
}

export default LocationPickerMap;
