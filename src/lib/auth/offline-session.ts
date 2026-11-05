import Dexie, { type Table } from 'dexie';
import { UUID_REGEX } from '@/lib/utils/uuid-helper';
import type {
  EstadoCuentaUsuario,
  MotivoSesionOfflineInvalida,
  PermisoRBAC,
  ResultadoValidacionSesionOffline,
  RolUsuario,
  SesionRBACOffline,
} from '@/types';

/**
 * Sesión RBAC offline firmada (CMP-05 / TASK-24 / CA-05.3 / RNF-002 / RNF-003).
 *
 * Por qué existe: en plazas de mercado como Cavasa y Santa Elena la señal es intermitente, y la
 * PWA debe seguir aplicando el confinamiento de roles sin red (un VOLUNTARIO no entra a
 * `/admin/usuarios` aunque esté offline). Para eso el perfil RBAC se guarda en el store
 * `sesion_rbac` de IndexedDB con un sello HMAC-SHA256 y un TTL de 24 horas.
 *
 * Qué garantiza y qué NO (importante para quien lo use):
 *  - Detecta manipulación manual del rol, del estado de cuenta o de la expiración, copia de una
 *    sesión desde otro dispositivo y retroceso del reloj. Si ocurre, revoca la sesión.
 *  - La clave HMAC se genera POR DISPOSITIVO con Web Crypto como NO extraíble: su valor crudo no
 *    se puede leer desde JavaScript ni viaja en el bundle. No hay ningún secreto en el código.
 *  - NO es una barrera contra el dueño del dispositivo con DevTools: quien ejecuta código dentro
 *    de la página puede invocar estas mismas funciones. Por eso es un control de experiencia y de
 *    integridad en el cliente; la AUTORIZACIÓN REAL siempre ocurre en el servidor (Server Actions
 *    y RLS). Al recuperar la señal hay que revalidar el perfil contra el servidor.
 *  - Una cuenta suspendida mientras el usuario está offline solo se detecta al reconectar o al
 *    expirar el TTL; ese es el costo inevitable de operar sin red.
 *  - Requiere contexto seguro (HTTPS o localhost) para `crypto.subtle`; en otro caso la sesión
 *    se considera inválida (ENTORNO_NO_SOPORTADO), nunca se acepta sin verificar.
 *
 * Se usa una base IndexedDB propia (`NexoSesionRBAC`) para no acoplarse a `src/lib/db.ts`.
 */

/** Vigencia de la sesión offline: 24 horas (CA-05.3). */
export const TTL_SESION_RBAC_MS = 24 * 60 * 60 * 1000;

/** Tolerancia de desfase de reloj entre guardar y validar. */
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;

const NOMBRE_DB = 'NexoSesionRBAC';
const ID_SESION = 'actual';
const ID_CLAVE = 'hmac-sha256-v1';
const ETIQUETA_FIRMA = 'nexo-sesion-rbac-v1';

const ROLES: readonly RolUsuario[] = ['ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR'];
const ESTADOS: readonly EstadoCuentaUsuario[] = ['ACTIVO', 'SUSPENDIDO', 'PENDIENTE_AUTORIZACION'];
const PERMISOS_CONOCIDOS: readonly PermisoRBAC[] = ['admin:users:read', 'admin:users:write'];
const FIRMA_HEX = /^[0-9a-f]{64}$/;

/** Datos necesarios para abrir una sesión offline tras un inicio de sesión en línea. */
export type EntradaSesionRBACOffline = Pick<SesionRBACOffline, 'userId' | 'rol' | 'estadoCuenta'>;

interface RegistroSesion extends SesionRBACOffline {
  id: string;
}

interface RegistroClave {
  id: string;
  clave: CryptoKey;
}

class SesionRBACDB extends Dexie {
  sesion_rbac!: Table<RegistroSesion, string>;
  claves_rbac!: Table<RegistroClave, string>;

  constructor() {
    super(NOMBRE_DB);
    this.version(1).stores({
      sesion_rbac: 'id',
      claves_rbac: 'id',
    });
  }
}

let instanciaDb: SesionRBACDB | null = null;

/** Apertura perezosa: evita tocar IndexedDB durante el render en servidor (Next.js SSR). */
function abrirDb(): SesionRBACDB {
  if (!instanciaDb) instanciaDb = new SesionRBACDB();
  return instanciaDb;
}

function entornoSoportado(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined'
  );
}

/**
 * Permisos protegidos que concede un rol. Hoy solo ADMIN tiene permisos administrativos
 * (CA-05.1 / CA-05.2); el resto de roles opera únicamente sus vistas de campo.
 * Se calcula SIEMPRE desde el rol firmado y no desde lo almacenado, para que un cambio de
 * política en el código surta efecto de inmediato.
 */
export function permisosParaRol(rol: RolUsuario): PermisoRBAC[] {
  return rol === 'ADMIN' ? ['admin:users:read', 'admin:users:write'] : [];
}

function aHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function desdeHex(hex: string) {
  const salida = new Uint8Array(hex.length / 2);
  for (let i = 0; i < salida.length; i++) {
    salida[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return salida;
}

/**
 * Carga que se firma. Se serializa como arreglo JSON con etiqueta de versión: es determinista y
 * sin ambigüedad de separadores. Cubre userId, rol, estadoCuenta y expiresAt (CA-05.3) y además
 * los permisos almacenados y issuedAt, para que ningún campo del perfil quede sin proteger.
 */
function cargaFirmable(s: Omit<SesionRBACOffline, 'signatureHash'>) {
  const texto = JSON.stringify([
    ETIQUETA_FIRMA,
    s.userId,
    s.rol,
    s.estadoCuenta,
    [...s.permisos].sort(),
    s.issuedAt,
    s.expiresAt,
  ]);
  return new TextEncoder().encode(texto);
}

/**
 * Obtiene la clave HMAC del dispositivo. Si no existe y `crear` es true, la genera como NO
 * extraíble y la persiste. Se genera fuera de la transacción de Dexie (una transacción IndexedDB
 * se cierra si se espera una promesa ajena a ella) y dentro se resuelve la carrera entre pestañas.
 */
async function obtenerClave(crear: boolean): Promise<CryptoKey | null> {
  const db = abrirDb();
  const existente = await db.claves_rbac.get(ID_CLAVE);
  if (existente) return existente.clave;
  if (!crear) return null;

  const nueva = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

  return db.transaction('rw', db.claves_rbac, async () => {
    const otra = await db.claves_rbac.get(ID_CLAVE);
    if (otra) return otra.clave;
    await db.claves_rbac.put({ id: ID_CLAVE, clave: nueva });
    return nueva;
  });
}

function esRegistroBienFormado(r: unknown): r is RegistroSesion {
  if (typeof r !== 'object' || r === null) return false;
  const v = r as Record<string, unknown>;
  return (
    typeof v.userId === 'string' &&
    UUID_REGEX.test(v.userId) &&
    typeof v.rol === 'string' &&
    (ROLES as readonly string[]).includes(v.rol) &&
    typeof v.estadoCuenta === 'string' &&
    (ESTADOS as readonly string[]).includes(v.estadoCuenta) &&
    Array.isArray(v.permisos) &&
    v.permisos.every((p) => typeof p === 'string' && (PERMISOS_CONOCIDOS as readonly string[]).includes(p)) &&
    typeof v.issuedAt === 'number' &&
    Number.isFinite(v.issuedAt) &&
    typeof v.expiresAt === 'number' &&
    Number.isFinite(v.expiresAt) &&
    typeof v.signatureHash === 'string' &&
    FIRMA_HEX.test(v.signatureHash)
  );
}

/**
 * Elimina el perfil RBAC almacenado: todos los permisos protegidos quedan revocados hasta
 * volver a iniciar sesión en línea. Úsala también al cerrar sesión.
 */
export async function revocarSesionRBACOffline(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await abrirDb().sesion_rbac.delete(ID_SESION);
}

/**
 * Guarda el perfil RBAC de un usuario recién autenticado EN LÍNEA, con sello HMAC-SHA256 y
 * vigencia de 24 horas. Por qué: permite aplicar el confinamiento de roles cuando luego no
 * haya señal (RNF-002). Reemplaza cualquier sesión previa. Devuelve la sesión persistida.
 *
 * @throws TypeError si los datos no son válidos o el entorno no soporta IndexedDB/Web Crypto.
 */
export async function guardarSesionRBACOffline(
  sesion: EntradaSesionRBACOffline,
  ahoraMs: number = Date.now()
): Promise<SesionRBACOffline> {
  if (!entornoSoportado()) {
    throw new TypeError('Este entorno no soporta sesión offline segura (requiere IndexedDB y Web Crypto en HTTPS).');
  }
  if (typeof sesion.userId !== 'string' || !UUID_REGEX.test(sesion.userId)) {
    throw new TypeError('userId debe ser un UUID válido.');
  }
  if (!(ROLES as readonly string[]).includes(sesion.rol)) {
    throw new TypeError('Rol no válido.');
  }
  if (!(ESTADOS as readonly string[]).includes(sesion.estadoCuenta)) {
    throw new TypeError('Estado de cuenta no válido.');
  }

  const sinFirma: Omit<SesionRBACOffline, 'signatureHash'> = {
    userId: sesion.userId,
    rol: sesion.rol,
    estadoCuenta: sesion.estadoCuenta,
    permisos: permisosParaRol(sesion.rol),
    issuedAt: ahoraMs,
    expiresAt: ahoraMs + TTL_SESION_RBAC_MS,
  };

  const clave = await obtenerClave(true);
  if (!clave) throw new TypeError('No fue posible obtener la clave de firma del dispositivo.');

  const firma = await crypto.subtle.sign('HMAC', clave, cargaFirmable(sinFirma));
  const completa: SesionRBACOffline = { ...sinFirma, signatureHash: aHex(firma) };

  await abrirDb().sesion_rbac.put({ id: ID_SESION, ...completa });
  return completa;
}

async function invalidar(motivo: MotivoSesionOfflineInvalida): Promise<ResultadoValidacionSesionOffline> {
  try {
    await revocarSesionRBACOffline();
  } catch {
    // Aun si no se pudo borrar, el resultado sigue siendo "inválida" y sin permisos.
  }
  return { valida: false, motivo, permisos: [] };
}

/**
 * Valida la sesión RBAC almacenada sin necesidad de red. Es válida solo si, en este orden:
 * existe, está bien formada, la firma HMAC coincide, no expiró (TTL 24 h), el reloj es coherente
 * y la cuenta está ACTIVO. En cualquier otro caso REVOCA la sesión (la borra) y devuelve
 * `valida: false` con `permisos: []`, de modo que las rutas protegidas queden bloqueadas hasta
 * revalidar credenciales en línea (CA-05.3).
 *
 * Los permisos devueltos se derivan del rol firmado, nunca de lo que haya en almacenamiento.
 */
export async function validarSesionRBACOffline(
  ahoraMs: number = Date.now()
): Promise<ResultadoValidacionSesionOffline> {
  if (!entornoSoportado()) {
    return { valida: false, motivo: 'ENTORNO_NO_SOPORTADO', permisos: [] };
  }

  let registro: unknown;
  try {
    registro = await abrirDb().sesion_rbac.get(ID_SESION);
  } catch {
    return { valida: false, motivo: 'SIN_SESION', permisos: [] };
  }

  if (registro === undefined) {
    return { valida: false, motivo: 'SIN_SESION', permisos: [] };
  }

  if (!esRegistroBienFormado(registro)) {
    return invalidar('FORMATO_INVALIDO');
  }

  const { id: _id, ...sesion } = registro;

  const clave = await obtenerClave(false);
  if (!clave) {
    return invalidar('CLAVE_NO_DISPONIBLE');
  }

  const { signatureHash, ...sinFirma } = sesion;
  const firmaOk = await crypto.subtle.verify('HMAC', clave, desdeHex(signatureHash), cargaFirmable(sinFirma));
  if (!firmaOk) {
    return invalidar('FIRMA_INVALIDA');
  }

  if (ahoraMs >= sesion.expiresAt) {
    return invalidar('EXPIRADA');
  }

  // Un reloj atrasado alargaría artificialmente la sesión: expiresAt nunca puede estar a más de
  // un TTL (más tolerancia) en el futuro, ni issuedAt en el futuro.
  if (
    sesion.expiresAt - ahoraMs > TTL_SESION_RBAC_MS + TOLERANCIA_RELOJ_MS ||
    sesion.issuedAt - ahoraMs > TOLERANCIA_RELOJ_MS
  ) {
    return invalidar('RELOJ_INCONSISTENTE');
  }

  if (sesion.estadoCuenta !== 'ACTIVO') {
    return invalidar('CUENTA_NO_ACTIVA');
  }

  return {
    valida: true,
    sesion,
    permisos: permisosParaRol(sesion.rol),
    restanteMs: sesion.expiresAt - ahoraMs,
  };
}
