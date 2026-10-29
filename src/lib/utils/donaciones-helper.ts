import type { ZonaCali } from '@/types';

/**
 * Normaliza cualquier formato de hora límite (HH:mm local o ISO completo)
 * a una cadena ISO válida para evitar errores de fecha ("Invalid time value").
 */
export function normalizarFechaHoraLimite(val: string): string {
  if (!val) return new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  
  const match = val.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (match) {
    const now = new Date();
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date(Date.now() + 4 * 3600 * 1000).toISOString() : parsed.toISOString();
}

/**
 * Infiere la zona geográfica de Cali a partir de la dirección o establecimiento.
 */
export function inferirZonaCali(texto: string): ZonaCali {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('siloe') || t.includes('ladera') || t.includes('terron') || t.includes('bellavista')) {
    return 'LADERA';
  }
  if (t.includes('santa elena') || t.includes('centro') || t.includes('san nicolas') || t.includes('calle 10')) {
    return 'CENTRO';
  }
  if (t.includes('cavasa') || t.includes('oriente') || t.includes('aguablanca') || t.includes('alfonso lopez') || t.includes('poblado')) {
    return 'ORIENTE';
  }
  if (t.includes('alameda') || t.includes('sur') || t.includes('san fernando') || t.includes('valle del lili') || t.includes('pance')) {
    return 'SUR';
  }
  if (t.includes('norte') || t.includes('granada') || t.includes('chipichape') || t.includes('porvenir')) {
    return 'NORTE';
  }
  return 'CENTRO';
}