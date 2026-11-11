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
  BarChart3,
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
 * Diseñado con indicadores digitales tipo consola SCADA y marco retro Windows 98.
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
      <div className="bevel-out bg-[#ece9d8] border-2 border-[#808080] p-8 text-center font-mono text-xs text-black">
        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-800" />
        <p className="font-bold">Auditando registros reales con estado ENTREGADA en base de datos...</p>
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
      className="flex flex-col gap-4 text-black font-mono text-xs"
    >
      {/* Cabecera de Auditoría y Exportación CSV */}
      <div className="bevel-out bg-[#ece9d8] p-3 flex flex-wrap items-center justify-between gap-3 border-2 border-[#808080]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-600">
              [CÁLCULO AUDITADO • CERO MOCKS (CA-05.4)]
            </span>
            <span className="font-mono text-[11px] text-slate-700 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-700" />
              <span>Fuente: {m.fuenteDatos}</span>
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-black flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>Métricas Consolidadas de Rescate Alimentario ({m.donacionesCompletadas} entregas cerradas)</span>
          </h2>
          <p className="text-[11px] text-slate-700">
            Solo contabiliza lotes con Acta Digital de Entrega firmada (estado = ENTREGADA).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarMetricas}
            disabled={cargando}
            className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <ExportarReporteCSV entregas={m.entregasDetalle} />
        </div>
      </div>

      {/* 4 Indicadores SCADA Digitales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Kilogramos */}
        <article className="bevel-in-dark bg-[#05080f] border border-slate-700 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Alimento Rescatado</span>
            <Scale className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono tracking-wider my-1">
            {m.totalKgRescatados} <span className="text-xs text-emerald-400">kg</span>
          </p>
          <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
            {m.donacionesCompletadas} donaciones entregadas
          </p>
        </article>

        {/* KPI 2: Raciones */}
        <article className="bevel-in-dark bg-[#05080f] border border-slate-700 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Raciones Estimadas</span>
            <Utensils className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tracking-wider my-1">
            {m.totalRacionesServidas} <span className="text-xs text-amber-400">platos</span>
          </p>
          <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
            Estándar FAO: 0.4 kg / ración
          </p>
        </article>

        {/* KPI 3: CO2e */}
        <article className="bevel-in-dark bg-[#05080f] border border-slate-700 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">CO₂ Evitado</span>
            <Leaf className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-sky-300 font-mono tracking-wider my-1">
            {m.emisionesCo2EvitadasKg} <span className="text-xs text-sky-400">kg CO₂e</span>
          </p>
          <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
            Factor FAO: {FACTOR_CO2_FAO} kg CO₂e / kg
          </p>
        </article>

        {/* KPI 4: Comedores */}
        <article className="bevel-in-dark bg-[#05080f] border border-slate-700 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Comedores y Red</span>
            <Building2 className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono tracking-wider my-1">
            {m.comedoresAbastecidos} <span className="text-xs text-purple-400">comedores</span>
          </p>
          <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
            {m.donantesParticipantes !== undefined
              ? `${m.donantesParticipantes} donantes • ${m.comedoresAbastecidos} comedores`
              : 'Organizaciones receptoras en Cali'}
          </p>
        </article>
      </div>

      {/* Tabla de Entregas Verificadas en formato Libro Mayor Retro */}
      <div className="bevel-out bg-[#ece9d8] p-3 border-2 border-[#808080]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black">
            LIBRO MAYOR DE ENTREGAS VERIFICADAS (ESTADO = ENTREGADA)
          </h3>
          <span className="text-[10px] text-slate-600">[ACTA DIGITAL REQUERIDA]</span>
        </div>

        {m.entregasDetalle.length === 0 ? (
          <div className="bevel-in bg-white p-6 text-center text-slate-700">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-bold text-black mb-1">
              0 kg rescatados • Aún no hay donaciones con acta de entrega cerrada
            </p>
            <p className="max-w-lg mx-auto text-[11px] text-slate-600">
              En cumplimiento del criterio CA-05.4 (transparencia de métricas), las donaciones en
              estado DISPONIBLE o ASIGNADA no inflan los indicadores hasta que el voluntario o el
              comedor firmen el Acta Digital de Entrega.
            </p>
          </div>
        ) : (
          <div className="bevel-in bg-white overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#d4d0c8] text-black uppercase text-[11px] border-b-2 border-[#808080]">
                  <th className="py-2 px-3 border-r border-[#808080]">Código</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Alimento</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Donante</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Comedor Receptor</th>
                  <th className="py-2 px-3 text-right border-r border-[#808080]">Kilogramos</th>
                  <th className="py-2 px-3 text-right border-r border-[#808080]">Raciones</th>
                  <th className="py-2 px-3">Fecha Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4d0c8]">
                {m.entregasDetalle.map((item) => (
                  <tr key={item.id || item.codigo} className="hover:bg-[#fff9d9] text-black">
                    <td className="py-2 px-3 font-bold text-blue-900 border-r border-[#d4d0c8]">{item.codigo}</td>
                    <td className="py-2 px-3 text-black border-r border-[#d4d0c8]">{item.tipoAlimento}</td>
                    <td className="py-2 px-3 text-slate-700 border-r border-[#d4d0c8]">{item.donante}</td>
                    <td className="py-2 px-3 text-slate-700 border-r border-[#d4d0c8]">{item.comedorReceptor}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-900 border-r border-[#d4d0c8]">
                      {item.kilogramos} kg
                    </td>
                    <td className="py-2 px-3 text-right text-amber-900 border-r border-[#d4d0c8]">
                      {item.racionesEstimadas}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
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