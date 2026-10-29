'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Truck, AlertCircle, ShieldCheck } from 'lucide-react';
import RutaActivaCard, { type MisionActiva } from '@/components/logistica/RutaActivaCard';

const MISION_DEMO: MisionActiva = {
  id: 'don-105',
  codigo: 'DON-105',
  tipoAlimento: 'Plátano Hartón y Verduras Frescas de Hoja',
  cantidadEstimada: 120,
  unidadMedida: 'kg',
  donanteNombre: 'Don Efraín - Galería Santa Elena',
  direccionRecogida: 'Calle 23 # 29-10, Cali, Valle del Cauca',
  indicacionesPuesto: 'Galería Santa Elena, Pabellón C, Puesto 45 (Frente a la balanza central)',
  telefonoDonante: '+573175550505',
  requiereFrio: false,
  horaLimite: '14:30',
  comedorNombre: 'Comedor Comunitario Siloé Solidario',
  comedorDireccion: 'Calle 3 Oeste # 52-20, Siloé, Cali',
};

export default function RutaActivaPage() {
  const [mision] = useState<MisionActiva | null>(MISION_DEMO);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 max-w-xl mx-auto flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/donaciones"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-300"
            aria-label="Volver al catálogo de donaciones"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              Ruta Activa de Campo
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              CMP-03 · Trazabilidad y despacho en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>GPS Activo</span>
        </div>
      </header>

      {mision ? (
        <section aria-label="Detalle de la misión de rescate asignada">
          <RutaActivaCard mision={mision} />

          <footer className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>
              Rescate amparado bajo la Ley 1990 de 2019. Transporte seguro y trazabilidad de alimentos.
            </span>
          </footer>
        </section>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-400 my-auto">
          <AlertCircle className="w-10 h-10 text-slate-500" aria-hidden="true" />
          <h2 className="text-base font-bold text-white">No tienes misiones activas</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            Selecciona una oferta disponible en el catálogo de donaciones para iniciar una nueva ruta de rescate.
          </p>
          <Link
            href="/donaciones"
            className="mt-2 min-h-[44px] px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>Ir al Catálogo de Ofertas</span>
          </Link>
        </div>
      )}
    </main>
  );
}
