/**
 * Generador determinista de código único offline (CMP-01 / CA-01.5 / TASK-29).
 *
 * Formato: OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4>
 *  - YYMMDD: fecha local de Colombia (UTC-5, sin horario de verano).
 *  - DEV4:   4 caracteres hexadecimales de la huella (fingerprint) persistente del dispositivo.
 *  - SEQ3:   contador diario local con padding de 3 dígitos (001..999).
 *  - ENT4:   4 caracteres base36 generados con crypto.getRandomValues().
 *
 * ¿Por qué?: En plazas sin señal (Cavasa, Santa Elena) dos dispositivos pueden registrar donaciones
 * el mismo día sin hablar con el servidor. La combinación fecha + dispositivo + secuencial + entropía
 * evita colisiones de código; la `idempotencyKey` (UUID v4) es la llave que el servidor usa para
 * descartar reintentos duplicados y reconciliar el código definitivo `DON-XXX`.
 *
 * Este módulo no depende de Dexie para evitar dependencias circulares con `src/lib/db.ts`.
 * El estado persistente (huella y contador) vive en localStorage, con respaldo en memoria
 * cuando el navegador lo bloquea o el código corre fuera del navegador (pruebas, SSR).
 */

/** Desfase fijo de Colombia respecto a UTC (no observa horario de verano). */
const OFFSET_COLOMBIA_MS = -5 * 60 * 60 * 1000;

const CLAVE_FINGERPRINT = 'nexo:device_fingerprint';
const PREFIJO_CLAVE_SECUENCIA = 'nexo:offline_seq:';

/** Formato canónico del código offline. */
export const CODIGO_OFFLINE_REGEX = /^OFFLINE-DON-\d{6}-[0-9A-F]{4}-\d{3}-[0-9A-Z]{4}$/;

/** Formato canónico de un UUID v4. */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Contrato mínimo de almacenamiento clave/valor (compatible con `Storage`). */
export interface AlmacenClaveValor {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem?(clave: string): void;
  key?(indice: number): string | null;
  readonly length?: number;
}

export interface OpcionesCodigoOffline {
  /** Reloj inyectable para pruebas determinísticas. */
  ahora?: Date;
  /** Almacén inyectable para pruebas. Por defecto localStorage o memoria. */
  almacen?: AlmacenClaveValor;
}

export interface CodigoOfflineGenerado {
  /** Código completo: OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4>. */
  codigo: string;
  /** Llave de idempotencia UUID v4 para reconciliación sin duplicados en el servidor. */
  idempotencyKey: string;
  /** Componentes del código, útiles para auditoría y pruebas. */
  fecha: string;
  dispositivo: string;
  secuencia: string;
  entropia: string;
}

/** Almacén en memoria usado cuando localStorage no está disponible. */
class AlmacenMemoria implements AlmacenClaveValor {
  private readonly datos = new Map<string, string>();

  getItem(clave: string): string | null {
    return this.datos.has(clave) ? (this.datos.get(clave) as string) : null;
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, valor);
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  key(indice: number): string | null {
    return Array.from(this.datos.keys())[indice] ?? null;
  }

  get length(): number {
    return this.datos.size;
  }
}

const almacenMemoria = new AlmacenMemoria();

/** Devuelve localStorage si es usable; de lo contrario, el respaldo en memoria. */
function resolverAlmacen(almacen?: AlmacenClaveValor): AlmacenClaveValor {
  if (almacen) return almacen;
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      const prueba = '__nexo_probe__';
      globalThis.localStorage.setItem(prueba, '1');
      globalThis.localStorage.removeItem(prueba);
      return globalThis.localStorage;
    }
  } catch {
    // Modo privado, cuota agotada o acceso denegado: usar memoria.
  }
  return almacenMemoria;
}

/** Acceso a la API criptográfica; sin ella no se genera nada (nunca se usa Math.random). */
function obtenerCrypto(): Crypto {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error(
      'crypto.getRandomValues no está disponible: no es posible generar códigos offline seguros.'
    );
  }
  return c;
}

/** Bytes aleatorios criptográficamente seguros. */
function bytesAleatorios(cantidad: number): Uint8Array {
  const bytes = new Uint8Array(cantidad);
  obtenerCrypto().getRandomValues(bytes);
  return bytes;
}

/**
 * Genera una UUID v4 con crypto.randomUUID() o, si no existe, con getRandomValues().
 */
export function generarIdempotencyKey(): string {
  const c = obtenerCrypto();
  if (typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  const b = bytesAleatorios(16);
  b[6] = (b[6] & 0x0f) | 0x40; // versión 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * 4 caracteres base36 (0-9A-Z) con muestreo por rechazo para evitar el sesgo del módulo.
 * 252 = 36 * 7 es el mayor múltiplo de 36 que cabe en un byte.
 */
function entropiaBase36(longitud = 4): string {
  const alfabeto = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let salida = '';
  while (salida.length < longitud) {
    for (const byte of bytesAleatorios(longitud * 2)) {
      if (byte < 252 && salida.length < longitud) {
        salida += alfabeto[byte % 36];
      }
    }
  }
  return salida;
}

/** YYMMDD según la fecha local de Colombia (UTC-5). */
export function fechaColombiaYYMMDD(ahora: Date = new Date()): string {
  const local = new Date(ahora.getTime() + OFFSET_COLOMBIA_MS);
  const yy = String(local.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Huella persistente del dispositivo (8 bytes aleatorios en hex), creada una sola vez por navegador.
 * No identifica a ninguna persona: es un identificador aleatorio local (Habeas Data, Ley 1581/2012).
 */
export function obtenerDeviceFingerprint(almacen?: AlmacenClaveValor): string {
  const store = resolverAlmacen(almacen);
  try {
    const existente = store.getItem(CLAVE_FINGERPRINT);
    if (existente && /^[0-9a-f]{16}$/.test(existente)) return existente;
  } catch {
    // Se genera una nueva abajo.
  }
  const nueva = Array.from(bytesAleatorios(8), (x) => x.toString(16).padStart(2, '0')).join('');
  try {
    store.setItem(CLAVE_FINGERPRINT, nueva);
  } catch {
    // Sin persistencia: la huella vale para esta sesión.
  }
  return nueva;
}

/**
 * Siguiente número del contador diario local (1..999). Al pasar de 999 reinicia en 1:
 * la unicidad real descansa en ENT4 y, sobre todo, en la idempotencyKey.
 * Además purga los contadores de días anteriores para no acumular claves.
 */
function siguienteSecuencia(fecha: string, almacen: AlmacenClaveValor): number {
  const clave = `${PREFIJO_CLAVE_SECUENCIA}${fecha}`;
  let actual = 0;
  try {
    const crudo = almacen.getItem(clave);
    const parsed = crudo === null ? 0 : parseInt(crudo, 10);
    actual = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    actual = 0;
  }

  const siguiente = actual >= 999 ? 1 : actual + 1;

  try {
    almacen.setItem(clave, String(siguiente));
    if (typeof almacen.key === 'function' && typeof almacen.length === 'number') {
      const obsoletas: string[] = [];
      for (let i = 0; i < almacen.length; i++) {
        const k = almacen.key(i);
        if (k && k.startsWith(PREFIJO_CLAVE_SECUENCIA) && k !== clave) obsoletas.push(k);
      }
      obsoletas.forEach((k) => almacen.removeItem?.(k));
    }
  } catch {
    // Sin persistencia: el contador no avanza entre sesiones; ENT4 + UUID evitan colisiones.
  }

  return siguiente;
}

/**
 * Genera el código determinista offline y su llave de idempotencia (CA-01.5).
 *
 * @example
 *   generarCodigoDonacionOffline().codigo // "OFFLINE-DON-261105-A3F9-001-K7Q2"
 */
export function generarCodigoDonacionOffline(
  opciones: OpcionesCodigoOffline = {}
): CodigoOfflineGenerado {
  const ahora = opciones.ahora ?? new Date();
  const almacen = resolverAlmacen(opciones.almacen);

  const fecha = fechaColombiaYYMMDD(ahora);
  const dispositivo = obtenerDeviceFingerprint(almacen).slice(0, 4).toUpperCase();
  const secuencia = String(siguienteSecuencia(fecha, almacen)).padStart(3, '0');
  const entropia = entropiaBase36(4);

  return {
    codigo: `OFFLINE-DON-${fecha}-${dispositivo}-${secuencia}-${entropia}`,
    idempotencyKey: generarIdempotencyKey(),
    fecha,
    dispositivo,
    secuencia,
    entropia,
  };
}

/** Indica si un texto es un código offline con el formato canónico. */
export function esCodigoOfflineValido(codigo: string): boolean {
  return CODIGO_OFFLINE_REGEX.test(codigo);
}
