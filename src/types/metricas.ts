/**
 * Definiciones de tipos y DTOs para métricas reales de impacto y auditoría histórica.
 *
 * ¿Por qué?: La UAO y los cooperantes internacionales (ej. Fundación Carvajal) exigen que
 * todas las cifras de kilogramos, raciones y mitigación de CO2e provengan estrictamente
 * de donaciones con cierre formal en estado ENTREGADA, prohibiendo valores simulados.
 */

export interface DonacionEntregadaResumenDTO {
  id: string;
  codigo: string;
  fechaRegistro: string;
  fechaEntrega: string;
  donante: string;
  comedorReceptor: string;
  kilogramos: number;
  racionesEstimadas: number;
  tipoAlimento: string;
}

export interface MetricasImpactoDTO {
  totalKgRescatados: number;
  totalRacionesServidas: number;
  emisionesCo2EvitadasKg: number;
  donacionesCompletadas: number;
  comedoresAbastecidos: number;
  entregasDetalle: DonacionEntregadaResumenDTO[];
  calculadoEnUtc: string;
  fuenteDatos: 'SUPABASE_POSTGRES' | 'MEMORIA_VOLATIL' | 'DATASET_PRUEBA';
}
