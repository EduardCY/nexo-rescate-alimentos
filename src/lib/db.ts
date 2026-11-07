import Dexie, { type Table } from 'dexie';
import type { Donacion, RolUsuario, ZonaCali } from '@/types';
import { generarCodigoDonacionOffline, generarIdempotencyKey } from '@/lib/utils/offline-code';

/**
 * Estados posibles para la sincronización de una donación almacenada localmente en IndexedDB.
 */
export type SyncStatus = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

/**
 * Entidad de almacenamiento local para donaciones registradas sin conectividad celular (RNF-002 / CA-01.5).
 * Modela los datos requeridos por la plataforma para garantizar la continuidad operativa en plazas de mercado
 * (ej. Cavasa, Santa Elena y Alameda) cuando la cobertura de red es intermitente o inexistente.
 *
 * TASK-29: `codigoTemporal` / `codigoLocal` usan el formato determinista
 * OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4> y `idempotencyKey` (UUID v4) permite al servidor
 * descartar reintentos duplicados.
 */
export interface DonacionOffline {
  id?: number;
  localId?: number;
  codigoTemporal?: string;
  /** Alias explícito del código determinista offline (mismo valor que `codigoTemporal`). */
  codigoLocal?: string;
  /** UUID v4 estable entre reintentos: llave de idempotencia ante el servidor. */
  idempotencyKey?: string;
  codigoServidor?: string;
  tipoAlimento: string;
  cantidadEstimada: number;
  unidadMedida: 'kg' | 'canastillas' | 'bultos' | 'unidades' | string;
  direccionRecogida: string;
  indicacionesPuesto?: string;
  telefonoDonante?: string;
  zona?: ZonaCali;
  coordenadas?: { lat: number; lng: number };
  horaLimite: string;
  requiereFrio: boolean;
  exencionSanitariaAceptada: boolean;
  estado: SyncStatus;
  syncStatus?: SyncStatus;
  createdAt?: string;
  donanteId?: string;
  donanteNombre?: string;
  /** Número de intentos fallidos de sincronización. */
  retryCount?: number;
  /** Último error observado al sincronizar (auditoría). */
  lastError?: string;
}

/** Tipos de mutación soportados por el Patrón Outbox (CA-PWA.4). */
export type TipoOperacionOutbox = 'CREATE_DONACION' | 'TAKE_DONACION' | 'CONFIRM_ENTREGA';

/**
 * Mutación pendiente de envío al servidor (Outbox Pattern auditable).
 * Cada mutación conserva su idempotencyKey, estado, número de reintentos y último error
 * para que el Inspector Visual de Cola Offline pueda auditarla.
 */
export interface OutboxMutation {
  id?: number;
  idempotencyKey: string;
  tipoOperacion: TipoOperacionOutbox;
  /** Identificador o código de la entidad objetivo (donación). */
  entidadId: string;
  payload: Record<string, unknown>;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  /** true cuando el servidor rechazó la mutación por regla de negocio (409/410/403...): no se reintenta. */
  terminal?: boolean;
  /** Código resultante en el servidor (p. ej. DON-105) cuando aplica. */
  resultadoCodigo?: string;
  /** true si el servidor ya había procesado esta idempotencyKey (reintento detectado). */
  duplicada?: boolean;
  createdAt: string;
  updatedAt?: string;
  syncedAt?: string;
}

/** Categorías del catálogo local (alineadas con `CategoryId` de `src/lib/nexo/impact.ts`). */
export type CategoriaProducto =
  | 'fruta'
  | 'panaderia'
  | 'lacteos'
  | 'viandas'
  | 'proteina'
  | 'granos';

/** Producto estandarizado del catálogo disponible sin red (CA-PWA.5). */
export interface ProductoCatalogo {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  requiereFrio: boolean;
  unidadSugerida: 'kg' | 'canastillas' | 'bultos' | 'unidades';
  /** ISO 8601. Base del delta sync: el servidor entrega solo registros con updated_at posterior. */
  updatedAt: string;
}

/**
 * Donación cacheada para consulta y filtrado sin conexión.
 * Por privacidad no incluye teléfono ni indicaciones de puesto (solo se revelan a quien toma la donación, CA-03.1).
 */
export type DonacionCache = Omit<
  Donacion,
  'telefonoDonante' | 'indicacionesPuesto' | 'voluntarioId' | 'voluntarioNombre'
> & {
  updatedAt: string;
};

/** Roles admitidos en la sesión offline (incluye el Administrador del Sistema de CMP-05). */
export type RolSesionRbac = RolUsuario | 'ADMIN';
export type EstadoCuentaRbac = 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION';

/** Perfil RBAC persistido para validar permisos sin red (CA-05.3). */
export interface SesionRbac {
  userId: string;
  rol: RolSesionRbac;
  estadoCuenta: EstadoCuentaRbac;
  permisos?: string[];
  issuedAt?: string;
  /** ISO 8601. TTL de 24 horas desde `issuedAt`. */
  expiresAt: string;
  /** Sello HMAC-SHA256 del perfil (lo calcula y verifica el módulo de sesión). */
  signatureHash?: string;
}

/** Marca de sincronización incremental por recurso (`last_sync_timestamp`). */
export interface MetaSync {
  clave: string;
  valor: string;
  updatedAt: string;
}

/** Máximo de reintentos automáticos de una mutación del outbox antes de requerir acción manual. */
export const MAX_REINTENTOS_OUTBOX = 5;

/**
 * Base de datos IndexedDB local motorizada por Dexie.js para la arquitectura Offline-First de la PWA.
 *
 * ¿Por qué?: En plazas de abastecimiento mayorista y minorista de Cali y el Valle, los comerciantes
 * enfrentan sótanos y áreas de baja cobertura 4G/5G. La base local permite registrar donaciones de inmediato
 * garantizando la exención sanitaria (Ley 1990 de 2019) y sincronizar en background al recuperar señal.
 *
 * Versión 2 (TASK-29): agrega el Patrón Outbox, catálogo de productos, caché de donaciones con
 * delta sync y persistencia de sesión RBAC. Conserva el nombre de la base y los stores de la v1
 * para no perder las donaciones pendientes de usuarios ya instalados.
 */
export class RescateAlimentosDB extends Dexie {
  donaciones!: Table<DonacionOffline, number>;
  donaciones_locales!: Table<DonacionOffline, number>;
  outbox_mutations!: Table<OutboxMutation, number>;
  catalogo_productos!: Table<ProductoCatalogo, string>;
  donaciones_cache!: Table<DonacionCache, string>;
  sesion_rbac!: Table<SesionRbac, string>;
  meta_sync!: Table<MetaSync, string>;

  constructor() {
    super('NexoRescateAlimentosDB');

    this.version(1).stores({
      donaciones: '++id, codigoTemporal, estado, syncStatus, tipoAlimento, horaLimite, createdAt',
      donaciones_locales: '++localId, codigoTemporal, syncStatus, estado, createdAt',
    });

    this.version(2)
      .stores({
        donaciones:
          '++id, codigoTemporal, codigoLocal, idempotencyKey, estado, syncStatus, tipoAlimento, horaLimite, createdAt',
        donaciones_locales: '++localId, codigoTemporal, syncStatus, estado, createdAt',
        outbox_mutations: '++id, idempotencyKey, tipoOperacion, entidadId, syncStatus, createdAt',
        // Nota: IndexedDB no indexa valores booleanos; `requiereFrio` se declara por contrato
        // pero los filtros por frío se resuelven con .filter() (ver consultarCatalogoProductosOffline).
        catalogo_productos: 'id, categoria, requiereFrio, updatedAt',
        donaciones_cache: 'id, codigo, zona, requiereFrio, estado, horaLimite, updatedAt',
        sesion_rbac: 'userId, rol, estadoCuenta, expiresAt',
        meta_sync: 'clave',
      })
      .upgrade(async (tx) => {
        // Las donaciones creadas con la v1 no tienen idempotencyKey: se les asigna una para que
        // un reintento de red tras la actualización no duplique el registro en el servidor.
        await tx
          .table<DonacionOffline, number>('donaciones')
          .toCollection()
          .modify((item) => {
            if (!item.idempotencyKey) item.idempotencyKey = generarIdempotencyKey();
            if (!item.codigoLocal && item.codigoTemporal) item.codigoLocal = item.codigoTemporal;
          });
      });
  }

  /**
   * Alias de `donaciones` con el nombre del contrato del plan técnico (`donaciones_offline`).
   * Es la misma tabla física: así se conservan los datos y los consumidores de la v1.
   */
  get donaciones_offline(): Table<DonacionOffline, number> {
    return this.donaciones;
  }
}

/** Nombre del contrato TASK-29 para la base de datos offline. */
export { RescateAlimentosDB as NexoOfflineDB };

/** Instancia única singleton de la base de datos local */
export const db = new RescateAlimentosDB();
export const RescateDatabase = RescateAlimentosDB;

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/**
 * Notifica a la ventana del navegador que la cola local ha cambiado.
 */
function notificarCambioCola(count?: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nexo:offline-queue-changed', {
        detail: { count },
      })
    );
  }
}

/**
 * Cuenta todo lo que sigue pendiente de envío: donaciones locales + mutaciones procesables del outbox.
 */
export async function contarPendientesTotales(): Promise<number> {
  const donaciones = await db.donaciones.where('estado').equals('PENDIENTE').count();
  const outbox = await db.outbox_mutations.where('syncStatus').anyOf('PENDIENTE', 'ERROR').count();
  return donaciones + outbox;
}

async function refrescarContadorCola(): Promise<void> {
  try {
    notificarCambioCola(await contarPendientesTotales());
  } catch {
    notificarCambioCola();
  }
}

// ---------------------------------------------------------------------------
// donaciones_offline (tabla `donaciones`)
// ---------------------------------------------------------------------------

/**
 * Guarda una donación en el almacenamiento local IndexedDB con estado 'PENDIENTE'
 * cuando no hay conexión a internet disponible (RNF-002).
 *
 * Genera el código determinista OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4> y una idempotencyKey (UUID v4)
 * que se conserva en todos los reintentos de sincronización (CA-01.5).
 *
 * @param donacion Datos de la donación a almacenar localmente.
 * @returns El identificador numérico autoincremental asignado en IndexedDB.
 */
export async function guardarDonacionOffline(
  donacion: Omit<
    DonacionOffline,
    'id' | 'localId' | 'estado' | 'syncStatus' | 'createdAt' | 'codigoTemporal' | 'idempotencyKey'
  > & {
    estado?: SyncStatus;
    syncStatus?: SyncStatus;
    codigoTemporal?: string;
    idempotencyKey?: string;
    createdAt?: string;
  }
): Promise<number> {
  const generado = generarCodigoDonacionOffline();
  const codigo = donacion.codigoTemporal || generado.codigo;

  const registro: DonacionOffline = {
    ...donacion,
    codigoTemporal: codigo,
    codigoLocal: codigo,
    idempotencyKey: donacion.idempotencyKey || generado.idempotencyKey,
    estado: 'PENDIENTE',
    syncStatus: 'PENDIENTE',
    retryCount: 0,
    createdAt: donacion.createdAt || new Date().toISOString(),
  };

  const id = await db.donaciones.add(registro);
  await refrescarContadorCola();

  return id;
}

/**
 * Recupera todas las donaciones almacenadas localmente cuyo estado de sincronización es 'PENDIENTE'.
 *
 * ¿Por qué?: Utilizado por los workers o la lógica de reconexión para despachar en cola FIFO
 * todas las donaciones pendientes hacia el servidor una vez se detecta conectividad online.
 *
 * @returns Lista de donaciones pendientes de sincronización.
 */
export async function obtenerDonacionesPendientes(): Promise<DonacionOffline[]> {
  return await db.donaciones.where('estado').equals('PENDIENTE').toArray();
}

/**
 * Actualiza el estado de una donación local a 'SINCRONIZADO' y asocia el código definitivo
 * retornado por la base de datos remota de Supabase.
 *
 * @param localId Identificador numérico local del registro en IndexedDB.
 * @param codigoServidor Código de negocio generado en el servidor (ej. 'DON-101').
 */
export async function marcarDonacionSincronizada(
  localId: number,
  codigoServidor: string
): Promise<void> {
  const previo = await db.donaciones.get(localId);

  await db.donaciones.update(localId, {
    estado: 'SINCRONIZADO',
    syncStatus: 'SINCRONIZADO',
    codigoServidor,
    lastError: undefined,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nexo:offline-synced', {
        detail: {
          localId,
          codigoServidor,
          codigoTemporal: previo?.codigoTemporal ?? previo?.codigoLocal ?? `OFFLINE-DON-${localId}`,
        },
      })
    );
    await refrescarContadorCola();
  }
}

/**
 * Registra un intento fallido de sincronización de una donación local (auditoría).
 * La donación sigue 'PENDIENTE' para que el siguiente ciclo la reintente.
 */
export async function registrarFalloDonacionOffline(localId: number, error: string): Promise<void> {
  const previo = await db.donaciones.get(localId);
  await db.donaciones.update(localId, {
    retryCount: (previo?.retryCount ?? 0) + 1,
    lastError: error.slice(0, 500),
  });
}

/**
 * Garantiza que una donación local tenga idempotencyKey antes de enviarla (registros previos a la v2).
 */
export async function asegurarIdempotencyKeyDonacion(item: DonacionOffline): Promise<string> {
  if (item.idempotencyKey) return item.idempotencyKey;
  const key = generarIdempotencyKey();
  const targetId = item.id ?? item.localId;
  if (targetId !== undefined) {
    await db.donaciones.update(targetId, { idempotencyKey: key });
  }
  return key;
}

// ---------------------------------------------------------------------------
// outbox_mutations (Patrón Outbox auditable)
// ---------------------------------------------------------------------------

export interface EntradaOutbox {
  tipoOperacion: TipoOperacionOutbox;
  entidadId: string;
  payload: Record<string, unknown>;
  /** Opcional: si se omite se genera una UUID v4. */
  idempotencyKey?: string;
}

export interface ResultadoEncolado {
  id: number;
  idempotencyKey: string;
  /** true si ya existía una mutación equivalente y no se creó una nueva. */
  duplicada: boolean;
}

/**
 * Encola una mutación en el outbox. Es idempotente:
 *  - la misma idempotencyKey nunca se inserta dos veces;
 *  - TAKE_DONACION / CONFIRM_ENTREGA no se duplican mientras haya una pendiente para la misma entidad
 *    (p. ej. doble toque del voluntario sin señal).
 */
export async function encolarMutacionOutbox(entrada: EntradaOutbox): Promise<ResultadoEncolado> {
  const idempotencyKey = entrada.idempotencyKey || generarIdempotencyKey();

  const resultado = await db.transaction('rw', db.outbox_mutations, async () => {
    const existentePorLlave = await db.outbox_mutations
      .where('idempotencyKey')
      .equals(idempotencyKey)
      .first();
    if (existentePorLlave?.id !== undefined) {
      return { id: existentePorLlave.id, idempotencyKey, duplicada: true };
    }

    if (entrada.tipoOperacion !== 'CREATE_DONACION') {
      const equivalente = await db.outbox_mutations
        .where('entidadId')
        .equals(entrada.entidadId)
        .filter(
          (m) =>
            m.tipoOperacion === entrada.tipoOperacion &&
            m.syncStatus !== 'SINCRONIZADO' &&
            !m.terminal
        )
        .first();
      if (equivalente?.id !== undefined) {
        return { id: equivalente.id, idempotencyKey: equivalente.idempotencyKey, duplicada: true };
      }
    }

    const ahora = new Date().toISOString();
    const id = await db.outbox_mutations.add({
      idempotencyKey,
      tipoOperacion: entrada.tipoOperacion,
      entidadId: entrada.entidadId,
      payload: entrada.payload,
      syncStatus: 'PENDIENTE',
      retryCount: 0,
      createdAt: ahora,
      updatedAt: ahora,
    });
    return { id, idempotencyKey, duplicada: false };
  });

  await refrescarContadorCola();
  return resultado;
}

/** Lista completa del outbox para el Inspector Visual de Cola Offline (más recientes primero). */
export async function listarOutbox(): Promise<OutboxMutation[]> {
  return (await db.outbox_mutations.toArray()).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

/**
 * Mutaciones que el sincronizador debe procesar ahora, en orden FIFO:
 * pendientes o con error reintentable (no terminales y por debajo del máximo de reintentos).
 */
export async function obtenerMutacionesProcesables(): Promise<OutboxMutation[]> {
  const items = await db.outbox_mutations
    .where('syncStatus')
    .anyOf('PENDIENTE', 'ERROR')
    .filter((m) => !m.terminal && m.retryCount < MAX_REINTENTOS_OUTBOX)
    .toArray();
  return items.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/** Marca una mutación como sincronizada y notifica el cambio de cola. */
export async function marcarMutacionSincronizada(
  id: number,
  detalle: { resultadoCodigo?: string; duplicada?: boolean } = {}
): Promise<void> {
  const ahora = new Date().toISOString();
  await db.outbox_mutations.update(id, {
    syncStatus: 'SINCRONIZADO',
    lastError: undefined,
    terminal: false,
    resultadoCodigo: detalle.resultadoCodigo,
    duplicada: detalle.duplicada ?? false,
    syncedAt: ahora,
    updatedAt: ahora,
  });

  const mutacion = await db.outbox_mutations.get(id);
  if (typeof window !== 'undefined' && mutacion) {
    window.dispatchEvent(
      new CustomEvent('nexo:outbox-synced', {
        detail: {
          id,
          tipoOperacion: mutacion.tipoOperacion,
          entidadId: mutacion.entidadId,
          resultadoCodigo: detalle.resultadoCodigo,
          duplicada: detalle.duplicada ?? false,
        },
      })
    );
  }
  await refrescarContadorCola();
}

/**
 * Registra un fallo: incrementa retryCount y guarda lastError.
 * Con `terminal: true` (rechazo de negocio) la mutación deja de reintentarse automáticamente.
 */
export async function registrarFalloMutacion(
  id: number,
  error: string,
  opciones: { terminal?: boolean } = {}
): Promise<void> {
  const previo = await db.outbox_mutations.get(id);
  await db.outbox_mutations.update(id, {
    syncStatus: 'ERROR',
    retryCount: (previo?.retryCount ?? 0) + 1,
    lastError: error.slice(0, 500),
    terminal: opciones.terminal ?? false,
    updatedAt: new Date().toISOString(),
  });
  await refrescarContadorCola();
}

/** Reinicia una mutación con error para reintentarla desde el Inspector (acción manual del usuario). */
export async function reintentarMutacion(id: number): Promise<void> {
  await db.outbox_mutations.update(id, {
    syncStatus: 'PENDIENTE',
    retryCount: 0,
    terminal: false,
    lastError: undefined,
    updatedAt: new Date().toISOString(),
  });
  await refrescarContadorCola();
}

// ---------------------------------------------------------------------------
// catalogo_productos (catálogo offline) y donaciones_cache
// ---------------------------------------------------------------------------

/** Marca temporal base de la semilla: cualquier dato del servidor es más reciente y la reemplaza. */
const FECHA_SEMILLA_CATALOGO = '2026-01-01T00:00:00.000Z';

const SEMILLA_CATALOGO: ProductoCatalogo[] = [
  { id: 'prod-fruta-tomate', nombre: 'Tomate chonto', categoria: 'fruta', requiereFrio: false, unidadSugerida: 'kg' },
  { id: 'prod-fruta-platano', nombre: 'Plátano maduro', categoria: 'fruta', requiereFrio: false, unidadSugerida: 'kg' },
  { id: 'prod-fruta-papaya', nombre: 'Papaya', categoria: 'fruta', requiereFrio: false, unidadSugerida: 'kg' },
  { id: 'prod-fruta-naranja', nombre: 'Naranja valencia', categoria: 'fruta', requiereFrio: false, unidadSugerida: 'canastillas' },
  { id: 'prod-fruta-verdura-hoja', nombre: 'Verduras de hoja', categoria: 'fruta', requiereFrio: true, unidadSugerida: 'kg' },
  { id: 'prod-pan-tajado', nombre: 'Pan tajado y rollos', categoria: 'panaderia', requiereFrio: false, unidadSugerida: 'kg' },
  { id: 'prod-pan-pandebono', nombre: 'Pandebono y roscas', categoria: 'panaderia', requiereFrio: false, unidadSugerida: 'canastillas' },
  { id: 'prod-lacteo-queso', nombre: 'Queso campesino', categoria: 'lacteos', requiereFrio: true, unidadSugerida: 'kg' },
  { id: 'prod-lacteo-yogur', nombre: 'Yogur', categoria: 'lacteos', requiereFrio: true, unidadSugerida: 'unidades' },
  { id: 'prod-lacteo-leche', nombre: 'Leche pasteurizada', categoria: 'lacteos', requiereFrio: true, unidadSugerida: 'unidades' },
  { id: 'prod-vianda-almuerzo', nombre: 'Almuerzos empacados', categoria: 'viandas', requiereFrio: true, unidadSugerida: 'unidades' },
  { id: 'prod-vianda-arroz', nombre: 'Arroz preparado', categoria: 'viandas', requiereFrio: true, unidadSugerida: 'kg' },
  { id: 'prod-proteina-pollo', nombre: 'Pollo', categoria: 'proteina', requiereFrio: true, unidadSugerida: 'kg' },
  { id: 'prod-proteina-huevo', nombre: 'Huevos', categoria: 'proteina', requiereFrio: false, unidadSugerida: 'canastillas' },
  { id: 'prod-grano-arroz', nombre: 'Arroz', categoria: 'granos', requiereFrio: false, unidadSugerida: 'bultos' },
  { id: 'prod-grano-frijol', nombre: 'Frijol y lentejas', categoria: 'granos', requiereFrio: false, unidadSugerida: 'bultos' },
].map((p) => ({ ...p, updatedAt: FECHA_SEMILLA_CATALOGO })) as ProductoCatalogo[];

/**
 * Siembra el catálogo local de productos para operar sin red desde la primera apertura (CA-PWA.5).
 * No pisa registros existentes (los del servidor tienen prioridad). Idempotente.
 *
 * @returns Cantidad de productos insertados.
 */
export async function sembrarCatalogoProductosOffline(): Promise<number> {
  return await db.transaction('rw', db.catalogo_productos, async () => {
    const existentes = new Set(await db.catalogo_productos.toCollection().primaryKeys());
    const nuevos = SEMILLA_CATALOGO.filter((p) => !existentes.has(p.id));
    if (nuevos.length > 0) await db.catalogo_productos.bulkAdd(nuevos);
    return nuevos.length;
  });
}

export interface FiltroCatalogoProductos {
  categoria?: CategoriaProducto;
  requiereFrio?: boolean;
  texto?: string;
}

/** Consulta y filtra el catálogo de productos directamente desde IndexedDB (sin red). */
export async function consultarCatalogoProductosOffline(
  filtro: FiltroCatalogoProductos = {}
): Promise<ProductoCatalogo[]> {
  const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const texto = filtro.texto ? normalizar(filtro.texto.trim()) : '';

  const base = filtro.categoria
    ? db.catalogo_productos.where('categoria').equals(filtro.categoria)
    : db.catalogo_productos.toCollection();

  const lista = await base
    .filter(
      (p) =>
        (filtro.requiereFrio === undefined || p.requiereFrio === filtro.requiereFrio) &&
        (!texto || normalizar(p.nombre).includes(texto))
    )
    .toArray();

  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export interface FiltroDonacionesCache {
  zona?: ZonaCali | 'TODAS';
  soloSinFrio?: boolean;
  ahora?: Date | number;
}

/**
 * Consulta las donaciones cacheadas: solo DISPONIBLES y vigentes, con filtro de zona y cadena de frío,
 * ordenadas por urgencia (hora límite ascendente). Funciona sin conexión (CA-PWA.5).
 */
export async function consultarDonacionesCacheOffline(
  filtro: FiltroDonacionesCache = {}
): Promise<DonacionCache[]> {
  const { zona = 'TODAS', soloSinFrio = false, ahora = Date.now() } = filtro;
  const refMs = ahora instanceof Date ? ahora.getTime() : ahora;

  const lista = await db.donaciones_cache
    .filter(
      (d) =>
        d.estado === 'DISPONIBLE' &&
        new Date(d.horaLimite).getTime() > refMs &&
        (zona === 'TODAS' || d.zona === zona) &&
        (!soloSinFrio || !d.requiereFrio)
    )
    .toArray();

  return lista.sort((a, b) => new Date(a.horaLimite).getTime() - new Date(b.horaLimite).getTime());
}

// ---------------------------------------------------------------------------
// meta_sync (last_sync_timestamp)
// ---------------------------------------------------------------------------

export type RecursoDelta = 'catalogo_productos' | 'donaciones_cache';

/** Devuelve el `last_sync_timestamp` del recurso o null si nunca se sincronizó. */
export async function obtenerLastSyncTimestamp(recurso: RecursoDelta): Promise<string | null> {
  const meta = await db.meta_sync.get(`last_sync_timestamp:${recurso}`);
  return meta?.valor ?? null;
}

export { sincronizarColaOffline, sincronizarCatalogoDelta } from './sync/offline-sync';
