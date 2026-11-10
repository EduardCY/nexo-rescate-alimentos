'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Scale,
  Utensils,
  Leaf,
  Building2,
  RefreshCw,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { FACTOR_CO2_FAO } from '@/actions/metricas';
import { consultarMetricasImpactoReal } from '@/actions/donaciones';
import type { MetricasImpactoDTO } from '@/types/metricas';
import { ExportarReporteCSV } from './ExportarReporteCSV';

/**
 * Dashboard de Métricas Reales de Impacto Social y Ambiental (`TASK-25` / `CMP-05` / `CA-05.4`).
 *
 * ¿Por qué?: RNF-006 y la Prueba de Gobierno UAO exigen que los indicadores de impacto se calculen
 * exclusivamente sobre donaciones con `estado === 'ENTREGADA'`, mostrando `0` cuando no existen
 * entregas verificadas y prohibiendo cualquier constante simulada.
 */
export function MetricasDashboard() {
  const [metricas, setMetricas] = useState<MetricasImpactoDTO | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarMetricas = useCallback(async () => {
    setCargando(true);
    try {
      const data = await consultarMetricasImpactoReal();
      setMetricas(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarMetricas();
  }, [cargarMetricas]);

  if (cargando && !metricas) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 text-center font-mono text-xs text-slate-300">
        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-400" />
        <p>Auditando registros reales con estado ENTREGADA...</p>
      </div>
    );
  }

  const m: MetricasImpactoDTO = metricas || {
    totalKgRescatados: 0,
    totalRacionesServidas: 0,
    emisionesCo2EvitadasKg: 0,
    donacionesCompletadas: 0,
    comedoresAbastecidos: 0,
    entregasDetalle: [],
    calculadoEnUtc: new Date().toISOString(),
    fuenteDatos: 'MEMORIA_VOLATIL',
  };

  return (
    <section
      aria-label="Tablero auditado de impacto social y ambiental"
      className="flex flex-col gap-5 text-slate-100"
    >
      {/* Cabecera de Auditoría y Exportación CSV */}
      <div className="rounded-2xl backdrop-blur-md bg-slate-900/80 border border-slate-700/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              CÁLCULO AUDITADO • CERO MOCKS (CA-05.4)
            </span>
            <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>Fuente: {m.fuenteDatos}</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Métricas Consolidadas de Rescate Alimentario ({m.donacionesCompletadas} entregas cerradas)
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Solo contabiliza lotes con Acta Digital de Entrega firmada (estado = ENTREGADA).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarMetricas}
            disabled={cargando}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-mono text-xs font-bold text-slate-100 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <ExportarReporteCSV entregas={m.entregasDetalle} />
        </div>
      </div>

      {/* 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-emerald-500/40 p-4">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="font-mono text-xs uppercase font-bold">Alimento Rescatado</span>
            <Scale className="w-5 h-5" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-white">
            {m.totalKgRescatados} <span className="text-sm text-emerald-400">kg</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            {m.donacionesCompletadas} donaciones efectivamente entregadas
          </p>
        </article>

        <article className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-amber-500/40 p-4">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="font-mono text-xs uppercase font-bold">Raciones Estimadas</span>
            <Utensils className="w-5 h-5" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-white">
            {m.totalRacionesServidas} <span className="text-sm text-amber-400">platos</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Estándar nutricional: 0.4 kg por ración servida
          </p>
        </article>

        <article className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-sky-500/40 p-4">
          <div className="flex items-center justify-between text-sky-400 mb-2">
            <span className="font-mono text-xs uppercase font-bold">Emisiones CO₂ Evitadas</span>
            <Leaf className="w-5 h-5" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-white">
            {m.emisionesCo2EvitadasKg} <span className="text-sm text-sky-400">kg CO₂e</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Factor técnico FAO: {FACTOR_CO2_FAO} kg CO₂e / kg rescatado
          </p>
        </article>

        <article className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-purple-500/40 p-4">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="font-mono text-xs uppercase font-bold">Comedores y Aliados</span>
            <Building2 className="w-5 h-5" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-white">
            {m.comedoresAbastecidos} <span className="text-sm text-purple-400">comedores</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            {m.donantesParticipantes !== undefined
              ? `${m.donantesParticipantes} donantes • ${m.comedoresAbastecidos} comedores activos`
              : 'Organizaciones receptoras verificadas en Cali'}
          </p>
        </article>
      </div>

      {/* Tabla de Entregas Verificadas o Empty State Transparente */}
      <div className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-slate-700/80 p-4 sm:p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
          Libro Mayor de Entregas Verificadas (estado = ENTREGADA)
        </h3>

        {m.entregasDetalle.length === 0 ? (
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-6 text-center font-mono text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-bold text-slate-200 mb-1">
              0 kg rescatados • Aun no hay donaciones con acta de entrega cerrada
            </p>
            <p className="max-w-lg mx-auto">
              En cumplimiento del criterio CA-05.4 (transparencia de métricas), las donaciones en
              estado DISPONIBLE o ASIGNADA no inflan los indicadores hasta que el voluntario o el
              comedor firmen el Acta Digital de Entrega.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                  <th className="py-2 px-3">Código</th>
                  <th className="py-2 px-3">Alimento</th>
                  <th className="py-2 px-3">Donante</th>
                  <th className="py-2 px-3">Comedor Receptor</th>
                  <th className="py-2 px-3 text-right">Kilogramos</th>
                  <th className="py-2 px-3 text-right">Raciones</th>
                  <th className="py-2 px-3">Fecha Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {m.entregasDetalle.map((item) => (
                  <tr key={item.id || item.codigo} className="hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-bold text-emerald-300">{item.codigo}</td>
                    <td className="py-2.5 px-3 text-white">{item.tipoAlimento}</td>
                    <td className="py-2.5 px-3 text-slate-300">{item.donante}</td>
                    <td className="py-2.5 px-3 text-sky-300">{item.comedorReceptor}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {item.kilogramos} kg
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300">
                      {item.racionesEstimadas}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(item.fechaEntrega).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default MetricasDashboard;
