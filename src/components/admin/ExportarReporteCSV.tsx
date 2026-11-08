'use client';

import React from 'react';
import { Download } from 'lucide-react';
import type { DonacionEntregadaResumenDTO } from '@/types/metricas';
import { generarContenidoReporteCSV } from '@/lib/utils/csv-export';

export { generarContenidoReporteCSV };

export interface ExportarReporteCSVProps {
  entregas: DonacionEntregadaResumenDTO[];
  disabled?: boolean;
}

/**
 * Botón de exportación de reporte de impacto en formato CSV UTF-8 (`TASK-25`).
 *
 * ¿Por qué?: Entrega a los roles ADMIN y COORDINADOR una descarga directa compatible con Excel
 * (incluyendo BOM UTF-8) exclusivamente con las donaciones en estado `ENTREGADA`.
 */
export function ExportarReporteCSV({ entregas, disabled = false }: ExportarReporteCSVProps) {
  const handleDescargar = () => {
    if (entregas.length === 0 || disabled) return;

    const csv = '\uFEFF' + generarContenidoReporteCSV(entregas);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fechaStr = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexo-reporte-impacto-${fechaStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDescargar}
      disabled={disabled || entregas.length === 0}
      aria-label="Exportar reporte consolidado en formato CSV"
      className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      <span>Exportar Reporte CSV ({entregas.length})</span>
    </button>
  );
}

export default ExportarReporteCSV;
