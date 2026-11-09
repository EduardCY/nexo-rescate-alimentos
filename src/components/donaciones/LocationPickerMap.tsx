'use client';

import React, { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import type { ZonaCali } from '@/types';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

export interface LocationCoords {
  lat: number;
  lng: number;
}

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
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Icono retro para el marcador de recogida
      const customIcon = L.divIcon({
        html: `
          <div style="
            background-color: #00e676;
            border: 2px solid #004d40;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 2px 2px 0 rgba(0,0,0,0.6);
          ">
            <span style="transform: rotate(45deg); font-size: 13px;">📍</span>
          </div>
        `,
        className: 'nexo-pin-picker',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker(initialCenter, {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        const lat = Number(latLng.lat.toFixed(5));
        const lng = Number(latLng.lng.toFixed(5));
        const newCoords: LocationCoords = { lat, lng };
        setCoordsActuales(newCoords);
        const zonaEstimada = estimarZonaPorCoords(lat, lng);
        onLocationSelect(newCoords, undefined, zonaEstimada);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(5));
        const lng = Number(e.latlng.lng.toFixed(5));
        const newCoords: LocationCoords = { lat, lng };
        marker.setLatLng([lat, lng]);
        setCoordsActuales(newCoords);
        const zonaEstimada = estimarZonaPorCoords(lat, lng);
        onLocationSelect(newCoords, undefined, zonaEstimada);
      });

      mapRef.current = map;
      markerRef.current = marker;
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

  // Actualizar centro cuando cambia la zona desde el select superior
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !mapaListo) return;
    const centroZona = ZONAS_CENTROS[zonaActual];
    if (centroZona && !coordenadas) {
      mapRef.current.flyTo(centroZona, 14, { duration: 0.8 });
      markerRef.current.setLatLng(centroZona);
      const newCoords: LocationCoords = { lat: centroZona[0], lng: centroZona[1] };
      setCoordsActuales(newCoords);
      onLocationSelect(newCoords, undefined, zonaActual);
    }
  }, [zonaActual, mapaListo]);

  // Manejo de geolocalización GPS real del dispositivo
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
        setGpsMensaje(`GPS no disponible (${err.message}). Haz clic directamente en el mapa para marcar.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col gap-2">
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
          <span>📍 Haz clic en el mapa o arrastra el pin para fijar el punto exacto de recogida</span>
          <span className="text-emerald-400 font-bold">OpenStreetMap / WGS84</span>
        </div>
      </div>
    </div>
  );
}

function estimarZonaPorCoords(lat: number, lng: number): ZonaCali {
  if (lat > 3.46) return 'NORTE';
  if (lng < -76.55) return 'LADERA';
  if (lng > -76.50) return 'ORIENTE';
  if (lat < 3.42) return 'SUR';
  return 'CENTRO';
}

export default LocationPickerMap;
