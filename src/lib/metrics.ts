import { CO2_KG_PER_KG, KG_PER_RATION, calcImpact, type Impact } from '@/lib/nexo/impact';
import type { Donacion } from '@/types';

/**
 * Resumen consolidado de indicadores de rendimiento clave (KPIs) para la Red de Rescate de Alimentos.
 */
export interface MetricasRescate {
  totalDonaciones: number;
  totalKgRescatados: number;
  totalRacionesEstimadas: number;
  co2MitigadoKg: number;
  co2MitigadoToneladas: number;
  aguaVirtualPreservadaLitros: number;
  donacionesActivas: number;
  donacionesEntregadas: number;
  tasaEfectividad: number; // Porcentaje 0 - 100
}

/**
 * Calcula las métricas consolidadas de impacto social y ambiental a partir de un conjunto de donaciones.
 * 
 * ¿Por qué?: RNF-006 y RF-007 exigen trazabilidad cuantitativa de kilos rescatados y raciones
 * para respaldar los informes de gestión ante la Fundación Mesa Común y cooperantes internacionales.
 * 
 * @param donaciones Lista de donaciones a procesar.
 * @returns Indicadores consolidados de impacto.
 */
export function calcularMetricasDonaciones(donaciones: Donacion[]): MetricasRescate {
  if (!donaciones || donaciones.length === 0) {
    return {
      totalDonaciones: 0,
      totalKgRescatados: 0,
      totalRacionesEstimadas: 0,
      co2MitigadoKg: 0,
      co2MitigadoToneladas: 0,
      aguaVirtualPreservadaLitros: 0,
      donacionesActivas: 0,
      donacionesEntregadas: 0,
      tasaEfectividad: 0,
    };
  }

  let totalKg = 0;
  let totalAgua = 0;
  let activas = 0;
  let entregadas = 0;

  for (const d of donaciones) {
    totalKg += Number(d.cantidadEstimada) || 0;
    if (d.estado === 'DISPONIBLE' || d.estado === 'ASIGNADA') {
      activas++;
    } else if (d.estado === 'ENTREGADA') {
      entregadas++;
    }

    // Estimar agua según categoría genérica
    const impactoItem = calcImpact(d.cantidadEstimada, 'fruta');
    totalAgua += impactoItem.waterL;
  }

  const co2Kg = totalKg * CO2_KG_PER_KG;
  const raciones = Math.floor(totalKg / KG_PER_RATION);
  const tasa = donaciones.length > 0 ? (entregadas / donaciones.length) * 100 : 0;

  return {
    totalDonaciones: donaciones.length,
    totalKgRescatados: Math.round(totalKg * 10) / 10,
    totalRacionesEstimadas: raciones,
    co2MitigadoKg: Math.round(co2Kg * 10) / 10,
    co2MitigadoToneladas: Math.round((co2Kg / 1000) * 100) / 100,
    aguaVirtualPreservadaLitros: Math.round(totalAgua),
    donacionesActivas: activas,
    donacionesEntregadas: entregadas,
    tasaEfectividad: Math.round(tasa * 10) / 10,
  };
}

/**
 * Checklist formal de verificación de la Definición de Terminado (Definition of Done - DoD)
 * para autorizar el paso de un comportamiento a la rama principal (main).
 */
export interface DoDChecklist {
  criteriosAceptacionCumplidos: boolean;
  pruebasAutomatizadasEnVerde: boolean;
  coberturaMinimaAlcanzada: boolean; // >= 80%
  analisisEstaticoSinErrores: boolean; // 0 errores de ESLint
  habeasDataAuditado: boolean; // Ley 1581
  exencionSanitariaAuditada: boolean; // Ley 1990
}

/**
 * Valida si un sprint o incremento de software satisface todos los criterios de la Definition of Done.
 * 
 * @param checklist Criterios evaluados por el equipo.
 * @returns Objeto con resultado booleano y lista de observaciones pendientes.
 */
export function validarDefinitionOfDone(checklist: DoDChecklist): {
  aprobado: boolean;
  bloqueos: string[];
} {
  const bloqueos: string[] = [];

  if (!checklist.criteriosAceptacionCumplidos) {
    bloqueos.push('Criterios de Aceptación Gherkin incompletos o sin verificar por un par.');
  }
  if (!checklist.pruebasAutomatizadasEnVerde) {
    bloqueos.push('Existen pruebas automatizadas fallidas en la suite de Vitest.');
  }
  if (!checklist.coberturaMinimaAlcanzada) {
    bloqueos.push('La cobertura de código es inferior al umbral del 80%.');
  }
  if (!checklist.analisisEstaticoSinErrores) {
    bloqueos.push('El análisis estático con ESLint presenta errores de linting.');
  }
  if (!checklist.habeasDataAuditado) {
    bloqueos.push('Incumplimiento de la Ley 1581 de 2012 (Captura de datos sensibles de beneficiarios).');
  }
  if (!checklist.exencionSanitariaAuditada) {
    bloqueos.push('Falta la compuerta de exención de responsabilidad sanitaria de la Ley 1990 de 2019.');
  }

  return {
    aprobado: bloqueos.length === 0,
    bloqueos,
  };
}
