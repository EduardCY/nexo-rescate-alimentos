'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, Truck, Snowflake, AlertCircle } from 'lucide-react';
import type { Donacion, ZonaFiltro } from '@/types';
import ZonasFilter, { ZONAS_CALI } from '@/components/donaciones/ZonasFilter';
import DonacionCard from '@/components/donaciones/DonacionCard';

const DONACIONES_INICIALES: Donacion[] = [
  {
    id: 'don-1',
    codigo: 'DON-101',
    donanteId: 'usr-1',
    donanteNombre: 'Supermercado Éxito - Centro',
    tipoAlimento: 'Lácteos y Yogures Variados',
    requiereFrio: true,
    cantidadEstimada: 45,
    unidadMedida: 'kg',
    direccionRecogida: 'Carrera 5 # 12-40, Muelle 2',
    indicacionesPuesto: 'Muelle de carga sobre la Carrera 5',
    telefonoDonante: '+573105550101',
    zona: 'CENTRO',
    horaLimite: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-2',
    codigo: 'DON-102',
    donanteId: 'usr-2',
    donanteNombre: 'Panadería La Espiga Dorada',
    tipoAlimento: 'Panadería y Pan de Bono Fresco',
    requiereFrio: false,
    cantidadEstimada: 30,
    unidadMedida: 'kg',
    direccionRecogida: 'Calle 9 # 28-15',
    indicacionesPuesto: 'Reclamar en el mostrador principal',
    telefonoDonante: '+573125550202',
    zona: 'SUR',
    horaLimite: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-3',
    codigo: 'DON-103',
    donanteId: 'usr-3',
    donanteNombre: 'Plaza de Mercado Alameda (Puesto 12)',
    tipoAlimento: 'Frutas Frescas (Papaya, Melón, Mango)',
    requiereFrio: false,
    cantidadEstimada: 80,
    unidadMedida: 'kg',
    direccionRecogida: 'Calle 8 # 26-30, Galería Alameda',
    indicacionesPuesto: 'Pabellón de Frutas, Pasillo 3, Puesto 12',
    telefonoDonante: '+573155550303',
    zona: 'CENTRO',
    horaLimite: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-4',
    codigo: 'DON-104',
    donanteId: 'usr-4',
    donanteNombre: 'Avícola Santa Rita',
    tipoAlimento: 'Pollo Fresco en Cadena de Frío',
    requiereFrio: true,
    cantidadEstimada: 60,
    unidadMedida: 'kg',
    direccionRecogida: 'Avenida 6N # 24-08',
    indicacionesPuesto: 'Entrada vehicular de despachos',
    telefonoDonante: '+573185550404',
    zona: 'NORTE',
    horaLimite: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-5',
    codigo: 'DON-105',
    donanteId: 'usr-5',
    donanteNombre: 'Galería Santa Elena (Puesto 45)',
    tipoAlimento: 'Plátano y Verduras de Hoja',
    requiereFrio: false,
    cantidadEstimada: 120,
    unidadMedida: 'kg',
    direccionRecogida: 'Calle 23 # 29-10',
    indicacionesPuesto: 'Pabellón C, Puesto 45',
    telefonoDonante: '+573175550505',
    zona: 'ORIENTE',
    horaLimite: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'don-6',
    codigo: 'DON-106',
    donanteId: 'usr-6',
    donanteNombre: 'Fruver Siloé',
    tipoAlimento: 'Naranjas y Cítricos Seleccionados',
    requiereFrio: false,
    cantidadEstimada: 50,
    unidadMedida: 'kg',
    direccionRecogida: 'Diagonal 51 # 2-10, Siloé',
    indicacionesPuesto: 'Frente al centro de salud',
    telefonoDonante: '+573165550606',
    zona: 'LADERA',
    horaLimite: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
];

export default function DonacionesCatalogoPage() {
  const [donaciones] = useState<Donacion[]>(DONACIONES_INICIALES);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ZonaFiltro>('TODAS');
  const [soloSinFrio, setSoloSinFrio] = useState(false);

  const conteosPorZona = useMemo(() => {
    const mapa: Record<ZonaFiltro, number> = {
      TODAS: 0,
      NORTE: 0,
      CENTRO: 0,
      SUR: 0,
      ORIENTE: 0,
      LADERA: 0,
    };

    donaciones.forEach((d) => {
      if (d.estado === 'DISPONIBLE') {
        mapa.TODAS += 1;
        if (d.zona && mapa[d.zona] !== undefined) {
          mapa[d.zona] += 1;
        }
      }
    });

    return mapa;
  }, [donaciones]);

  const donacionesFiltradas = useMemo(() => {
    return donaciones.filter((donacion) => {
      if (donacion.estado !== 'DISPONIBLE') return false;

      const coincideZona =
        zonaSeleccionada === 'TODAS' || donacion.zona === zonaSeleccionada;

      const coincideFrio = soloSinFrio ? !donacion.requiereFrio : true;

      return coincideZona && coincideFrio;
    });
  }, [donaciones, zonaSeleccionada, soloSinFrio]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 max-w-4xl mx-auto flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-300"
            aria-label="Volver al panel principal"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              Catálogo de Donaciones
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              CMP-02 · Visualización y filtrado en tiempo real
            </p>
          </div>
        </div>

        <Link
          href="/ruta-activa"
          className="min-h-[44px] px-3.5 py-2 rounded-lg bg-sky-950 border border-sky-500/50 hover:bg-sky-900 text-sky-200 text-xs font-mono font-bold flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Ver Mi Ruta Activa</span>
        </Link>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3">
        <ZonasFilter
          zonaSeleccionada={zonaSeleccionada}
          onSelectZona={setZonaSeleccionada}
          conteosPorZona={conteosPorZona}
        />

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={soloSinFrio}
              onChange={(e) => setSoloSinFrio(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-slate-900"
            />
            <span className="flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              Excluir alimentos que requieren frío (Comedores sin nevera)
            </span>
          </label>

          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
            {donacionesFiltradas.length} disponibles
          </span>
        </div>
      </div>

      <section
        id="panel-donaciones"
        aria-label="Lista de donaciones disponibles"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {donacionesFiltradas.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <AlertCircle className="w-8 h-8 text-slate-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-300">
              No hay donaciones disponibles con los filtros aplicados.
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Prueba seleccionando &quot;TODAS&quot; o desactivando el filtro de refrigeración.
            </p>
          </div>
        ) : (
          donacionesFiltradas.map((donacion) => (
            <DonacionCard
              key={donacion.id}
              donacion={donacion}
              onTomarDonacion={(id) => {
                alert(`Donación ${id} seleccionada para tomar.`);
              }}
            />
          ))
        )}
      </section>
    </main>
  );
}
