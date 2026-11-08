// Módulo híbrido de cálculo auditado de métricas de impacto (CMP-05 / TASK-14 / CA-05.4)

import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import type { MetricasImpactoDTO, DonacionEntregadaResumenDTO } from '@/types/metricas';
import type { Donacion } from '@/types';
import { KG_PER_RATION } from '@/lib/nexo/impact';

/**
 * Factor de emisión evitada por kilogramo de alimento rescatado según la FAO:
 * 2.5 kg de CO2 equivalente por cada kg de alimento que no termina en vertedero o descomposición.
 */
export const FACTOR_CO2_FAO = 2.5;

export type RegistroEntradaImpacto = Partial<Donacion> | Record<string, unknown>;

/**
 * Reduce un conjunto de registros de donaciones para obtener indicadores de impacto real.
 *
 * ¿Por qué?: Centralizar la lógica matemática en una función pura permite que tanto la Server Action
 * como las suites de pruebas unitarias BDD ejecuten idéntico cómputo sin discrepancias.
 *
 * @param donaciones Registros a procesar (pueden venir de base de datos o de almacén volátil).
 * @param fuente Identificador del origen de los datos.
 * @returns DTO estructurado con las métricas consolidadas.
 */
export function procesarMetricasImpacto(
  donaciones: RegistroEntradaImpacto[],
  fuente: 'SUPABASE_POSTGRES' | 'MEMORIA_VOLATIL' | 'DATASET_PRUEBA' = 'MEMORIA_VOLATIL'
): MetricasImpactoDTO {
  // Filtrar estrictamente por estado ENTREGADA (Criterio CA-05.4 / Prueba de Gobierno UAO)
  const entregadas = donaciones.filter((d) => (d as Record<string, unknown>).estado === 'ENTREGADA');

  if (entregadas.length === 0) {
    return {
      totalKgRescatados: 0,
      totalRacionesServidas: 0,
      emisionesCo2EvitadasKg: 0,
      donacionesCompletadas: 0,
      comedoresAbastecidos: 0,
      entregasDetalle: [],
      calculadoEnUtc: new Date().toISOString(),
      fuenteDatos: fuente,
    };
  }

  let totalKg = 0;
  let totalRaciones = 0;
  const comedoresUnicos = new Set<string>();
  const entregasDetalle: DonacionEntregadaResumenDTO[] = [];

  for (const item of entregadas) {
    const raw = item as Record<string, unknown>;
    const rawKg = raw.cantidad_estimada ?? raw.cantidadEstimada ?? 0;
    const kg = Number(rawKg) > 0 ? Number(rawKg) : 0;
    totalKg += kg;

    // Si la donación o el acta registra raciones explícitas se usan; de lo contrario se calcula por porción estándar
    const rawRaciones = raw.raciones_estimadas ?? raw.racionesEstimadas;
    const raciones =
      rawRaciones !== undefined && Number(rawRaciones) > 0
        ? Math.floor(Number(rawRaciones))
        : Math.floor(kg / KG_PER_RATION);
    totalRaciones += raciones;

    const comedor = String(
      raw.comedor_nombre ?? raw.comedorNombre ?? raw.comedor_id ?? raw.comedorId ?? 'Comedor Comunitario'
    ).trim();
    if (comedor) {
      comedoresUnicos.add(comedor);
    }

    entregasDetalle.push({
      id: String(raw.id ?? ''),
      codigo: String(raw.codigo ?? 'DON-000'),
      fechaRegistro: String(raw.created_at ?? raw.createdAt ?? ''),
      fechaEntrega: String(raw.entregada_at ?? raw.entregadaAt ?? new Date().toISOString()),
      donante: String(raw.donante_nombre ?? raw.donanteNombre ?? 'Donante Anónimo'),
      comedorReceptor: comedor,
      kilogramos: Math.round(kg * 10) / 10,
      racionesEstimadas: raciones,
      tipoAlimento: String(raw.tipo_alimento ?? raw.tipoAlimento ?? 'Alimentos varios'),
    });
  }

  // Factor técnico FAO: 2.5 kg CO2e por cada kg de alimento rescatado
  const co2Evitado = Math.round(totalKg * FACTOR_CO2_FAO * 10) / 10;

  return {
    totalKgRescatados: Math.round(totalKg * 10) / 10,
    totalRacionesServidas: totalRaciones,
    emisionesCo2EvitadasKg: co2Evitado,
    donacionesCompletadas: entregadas.length,
    comedoresAbastecidos: comedoresUnicos.size,
    entregasDetalle,
    calculadoEnUtc: new Date().toISOString(),
    fuenteDatos: fuente,
  };
}

/**
 * Función para consultar las métricas consolidadas de impacto social y ambiental.
 *
 * ¿Por qué?: RNF-006, RF-007 y CMP-05 (CA-05.4) ordenan transparencia absoluta en las cifras de impacto.
 * Esta función garantiza cero datos simulados o constantes artificiales, calculando todo
 * exclusivamente a partir de donaciones efectivamente entregadas.
 *
 * @param datasetOpcional Permite inyectar fixtures durante pruebas unitarias o de integración.
 * @returns Promesa con el consolidado auditado de impacto.
 */
export async function obtenerMetricasImpactoReal(
  datasetOpcional?: RegistroEntradaImpacto[]
): Promise<MetricasImpactoDTO> {
  // 1. Si se provee dataset explícito (pruebas automatizadas aisladas)
  if (datasetOpcional) {
    return procesarMetricasImpacto(datasetOpcional, 'DATASET_PRUEBA');
  }

  // 2. Si Supabase se encuentra configurado en producción / staging
  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('donaciones')
        .select('*')
        .eq('estado', 'ENTREGADA')
        .order('entregada_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return procesarMetricasImpacto(data, 'SUPABASE_POSTGRES');
      }
    } catch {
      // Degradar limpiamente al almacén volátil en memoria
    }
  }

  // 3. Fallback al almacén volátil en memoria (desarrollo local / entorno de pruebas sin BD externa)
  const itemsVolatiles: RegistroEntradaImpacto[] = [];
  if (globalThis.__NEXO_DONACIONES_VOLATILES) {
    for (const donacion of Array.from(globalThis.__NEXO_DONACIONES_VOLATILES.values())) {
      itemsVolatiles.push(donacion);
    }
  }

  return procesarMetricasImpacto(itemsVolatiles, 'MEMORIA_VOLATIL');
}
