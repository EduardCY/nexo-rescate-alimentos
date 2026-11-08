import type { DonacionEntregadaResumenDTO } from '@/types/metricas';

/**
 * Escapa un campo de texto para cumplir con el estándar CSV RFC 4180.
 *
 * ¿Por qué?: Garantiza que nombres de comedores o donantes con comas o comillas
 * no corrompan las columnas al abrir el archivo en hojas de cálculo o sistemas contables.
 */
export function escaparCampoCSV(valor: string | number): string {
  const texto = String(valor ?? '').replace(/"/g, '""');
  if (/[",\n\r]/.test(texto)) {
    return `"${texto}"`;
  }
  return texto;
}

/**
 * Construye el contenido CSV auditado de entregas reales (CMP-05 / TASK-25 / CA-05.4).
 *
 * ¿Por qué?: Permite a Coordinadores y Administradores exportar el libro mayor de entregas
 * verificadas (`estado = 'ENTREGADA'`) para auditorías de responsabilidad social y ante la DIAN.
 */
export function generarContenidoReporteCSV(entregas: DonacionEntregadaResumenDTO[]): string {
  const encabezados = [
    'Codigo',
    'FechaRegistro',
    'FechaEntrega',
    'Donante',
    'ComedorReceptor',
    'Kilogramos',
    'RacionesEstimadas',
  ];

  const filas = entregas.map((item) =>
    [
      escaparCampoCSV(item.codigo),
      escaparCampoCSV(item.fechaRegistro),
      escaparCampoCSV(item.fechaEntrega),
      escaparCampoCSV(item.donante),
      escaparCampoCSV(item.comedorReceptor),
      escaparCampoCSV(item.kilogramos),
      escaparCampoCSV(item.racionesEstimadas),
    ].join(',')
  );

  return [encabezados.join(','), ...filas].join('\r\n');
}
