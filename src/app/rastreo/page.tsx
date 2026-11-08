'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  AlertCircle,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import {
  consultarRastreoDonacion,
  obtenerTodasLasDonaciones,
  type ResultadoRastreoDonacion,
} from '@/actions/donaciones';
import { TimelineTracker } from '@/components/rastreo/TimelineTracker';

function RastreoContenido() {
  const searchParams = useSearchParams();
  const codigoInicial = searchParams.get('codigo') || '';

  const [codigoBusqueda, setCodigoBusqueda] = useState(codigoInicial);
  const [rastreo, setRastreo] = useState<ResultadoRastreoDonacion | null>(null);
  const [codigosRecientes, setCodigosRecientes] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerTodasLasDonaciones()
      .then((lista) => {
        const cods = lista.slice(0, 6).map((d) => d.codigo);
        setCodigosRecientes(cods);
      })
      .catch(() => {});
  }, []);

  const ejecutarConsulta = async (codigo: string) => {
    const limpio = codigo.trim();
    if (!limpio) {
      setErrorMsg('Por favor ingresa un código de seguimiento (ej. DON-101).');
      return;
    }

    setCargando(true);
    setErrorMsg(null);
    try {
      const resultado = await consultarRastreoDonacion(limpio);
      if (!resultado) {
        setRastreo(null);
        setErrorMsg(
          `No se encontró ninguna donación registrada con el código "${limpio.toUpperCase()}". Verifica el código o publica primero una donación.`
        );
      } else {
        setRastreo(resultado);
      }
    } catch {
      setErrorMsg('No fue posible consultar la trazabilidad del lote en este momento.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (codigoInicial) {
      void ejecutarConsulta(codigoInicial);
    }
  }, [codigoInicial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ejecutarConsulta(codigoBusqueda);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Buscador de código de donación */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl backdrop-blur-md bg-slate-900/80 border border-slate-700/80 p-4 sm:p-5 flex flex-col gap-3"
      >
        <label
          htmlFor="input-codigo-rastreo"
          className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400"
        >
          Código de Trazabilidad del Lote (DON-XXX o OFFLINE-DON-...)
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              id="input-codigo-rastreo"
              type="text"
              value={codigoBusqueda}
              onChange={(e) => setCodigoBusqueda(e.target.value)}
              placeholder="Ej. DON-101 o OFFLINE-DON-261107-..."
              className="w-full min-h-[48px] rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {cargando ? (
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Consultar Estado</span>
          </button>
        </div>

        {/* Accesos rápidos a lotes reales creados por los usuarios */}
        {codigosRecientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-xs">
            <span className="text-slate-400 text-[11px]">Lotes registrados recientemente:</span>
            {codigosRecientes.map((cod) => (
              <button
                key={cod}
                type="button"
                onClick={() => {
                  setCodigoBusqueda(cod);
                  void ejecutarConsulta(cod);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 font-bold text-[11px]"
              >
                {cod}
              </button>
            ))}
          </div>
        )}
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-amber-950/70 border border-amber-500/50 p-4 text-amber-200 font-mono text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {rastreo ? (
        <TimelineTracker rastreo={rastreo} />
      ) : (
        !errorMsg && (
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8 text-center font-mono text-xs text-slate-400">
            <QrCode className="w-10 h-10 mx-auto mb-2 text-emerald-400/70" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-200 mb-1">
              Audita en tiempo real el estado de cualquier donación
            </p>
            <p className="max-w-md mx-auto">
              Ingresa el código asignado al publicar el excedente para visualizar los 3 hitos de
              custodia, el voluntario en ruta y el acta firmada por el comedor receptor.
            </p>
          </div>
        )
      )}
    </div>
  );
}

/**
 * Vista de Rastreo y Trazabilidad de Donaciones (`/rastreo` — CMP-04 / TASK-13).
 */
export default function RastreoPage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 flex items-center justify-center text-slate-200"
              aria-label="Volver al portal principal"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Rastreo y Trazabilidad de Custodia</span>
              </h1>
              <p className="text-xs font-mono text-slate-400">
                Verificación en 3 hitos del rescate alimentario • Ley 1990 de 2019
              </p>
            </div>
          </div>

          <Link
            href="/donaciones"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-emerald-300 flex items-center gap-1.5"
          >
            <span>Ir al Catálogo</span>
          </Link>
        </header>

        <Suspense
          fallback={
            <div className="rounded-2xl bg-slate-900 p-8 text-center font-mono text-xs text-slate-300">
              Cargando módulo de rastreo...
            </div>
          }
        >
          <RastreoContenido />
        </Suspense>
      </div>
    </main>
  );
}
