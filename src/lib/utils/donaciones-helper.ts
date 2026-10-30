import type { EstadoDonacion, ZonaCali, ZonaFiltro } from '@/types';

/**
 * Normaliza cualquier formato de hora límite (HH:mm local o ISO completo)
 * a una cadena ISO válida para evitar errores de fecha ("Invalid time value").
 */
export function normalizarFechaHoraLimite(val: string): string {
  if (!val) return new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  
  const match = val.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
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

/**
 * Convierte un valor de hora límite (ISO o HH:mm) a timestamp en milisegundos de forma determinística.
 * Si recibe un reloj de referencia `ahora`, lo usa para fijar el día de las horas locales relativas.
 */
export function obtenerTimestampHoraLimite(horaLimite: string, ahora: Date | number = new Date()): number {
  const refDate = ahora instanceof Date ? ahora : new Date(ahora);
  const match = horaLimite.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const target = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), hours, minutes, 0, 0);
    return target.getTime();
  }
  const parsed = new Date(horaLimite);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

/**
 * Determina si una hora límite ya expiró en relación a un punto en el tiempo (CA-02.4).
 * Permite inyectar el parámetro `ahora` para tests determinísticos con relojes fijados.
 */
export function estaExpirada(horaLimite: string, ahora: Date | number = new Date()): boolean {
  const refTime = ahora instanceof Date ? ahora.getTime() : ahora;
  const timeLimite = obtenerTimestampHoraLimite(horaLimite, ahora);
  return timeLimite <= refTime;
}

/**
 * Evalúa el estado de vigencia de una donación.
 * Si su estado nominal es 'DISPONIBLE' pero su hora límite ya expiró respecto a `ahora`,
 * retorna 'EXPIRADA' (CA-02.4).
 */
export function obtenerEstadoActualizado<T extends { estado: EstadoDonacion | string; horaLimite: string }>(
  donacion: T,
  ahora: Date | number = new Date()
): EstadoDonacion {
  if (donacion.estado === 'DISPONIBLE' && estaExpirada(donacion.horaLimite, ahora)) {
    return 'EXPIRADA';
  }
  return donacion.estado as EstadoDonacion;
}

/**
 * Filtro determinístico por sector geográfico de Cali (CA-02.3).
 */
export function filtrarPorZona<T extends { zona?: ZonaCali | string }>(
  donaciones: T[],
  zona?: ZonaFiltro
): T[] {
  if (!zona || zona === 'TODAS') {
    return [...donaciones];
  }
  return donaciones.filter((d) => d.zona === zona);
}

export interface OpcionesFiltroCatalogo {
  zona?: ZonaFiltro;
  ahora?: Date | number;
  soloSinFrio?: boolean;
}

/**
 * Función pura y determinística que procesa y filtra el catálogo de donaciones (CA-02.1, CA-02.2, CA-02.3, CA-02.4).
 *
 * Criterios aplicados:
 * - CA-02.1: Solo incluye ofertas con estado DISPONIBLE vigente. Excluye ASIGNADA, ENTREGADA y EXPIRADA.
 * - CA-02.2: Permite excluir ofertas con requerimiento de frío si el receptor no tiene refrigeración.
 * - CA-02.3: Filtrado determinístico por zona de Cali.
 * - CA-02.4: Excluye donaciones cuya hora límite sea anterior o igual a `ahora`, y ordena por urgencia (hora límite ascendente).
 */
export function filtrarDonacionesDisponibles<
  T extends {
    estado: EstadoDonacion | string;
    horaLimite: string;
    zona?: ZonaCali | string;
    requiereFrio?: boolean;
  }
>(
  donaciones: T[],
  opciones: OpcionesFiltroCatalogo = {}
): T[] {
  const { zona = 'TODAS', ahora = new Date(), soloSinFrio = false } = opciones;
  const refTime = ahora instanceof Date ? ahora.getTime() : ahora;

  return donaciones
    .filter((d) => {
      // 1. Debe estar en estado DISPONIBLE y no expirada respecto a `ahora`
      const estadoReal = obtenerEstadoActualizado(d, ahora);
      if (estadoReal !== 'DISPONIBLE') {
        return false;
      }

      // 2. Filtro de zona
      if (zona !== 'TODAS' && d.zona !== zona) {
        return false;
      }

      // 3. Filtro de cadena de frío
      if (soloSinFrio && d.requiereFrio) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const tA = obtenerTimestampHoraLimite(a.horaLimite, ahora);
      const tB = obtenerTimestampHoraLimite(b.horaLimite, ahora);
      return tA - tB;
    });
}
