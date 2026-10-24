import Dexie, { type Table } from 'dexie';

/**
 * Estados posibles para la sincronización de una donación almacenada localmente en IndexedDB.
 */
export type SyncStatus = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

/**
 * Entidad de almacenamiento local para donaciones registradas sin conectividad celular (RNF-002 / CA-01.5).
 * Modela los datos requeridos por la plataforma para garantizar la continuidad operativa en plazas de mercado
 * (ej. Cavasa, Santa Elena y Alameda) cuando la cobertura de red es intermitente o inexistente.
 */
export interface DonacionOffline {
  id?: number;
  localId?: number;
  codigoTemporal?: string;
  codigoServidor?: string;
  tipoAlimento: string;
  cantidadEstimada: number;
  unidadMedida: 'kg' | 'canastillas' | 'bultos' | 'unidades' | string;
  direccionRecogida: string;
  horaLimite: string;
  requiereFrio: boolean;
  exencionSanitariaAceptada: boolean;
  estado: SyncStatus;
  syncStatus?: SyncStatus;
  createdAt?: string;
  donanteId?: string;
  donanteNombre?: string;
}

/**
 * Base de datos IndexedDB local motorizada por Dexie.js para la arquitectura Offline-First de la PWA.
 *
 * ¿Por qué?: En plazas de abastecimiento mayorista y minorista de Cali y el Valle, los comerciantes
 * enfrentan sótanos y áreas de baja cobertura 4G/5G. La base local permite registrar donaciones de inmediato
 * garantizando la exención sanitaria (Ley 1990 de 2019) y sincronizar en background al recuperar señal.
 */
export class RescateAlimentosDB extends Dexie {
  donaciones!: Table<DonacionOffline, number>;
  donaciones_locales!: Table<DonacionOffline, number>;

  constructor() {
    super('NexoRescateAlimentosDB');
    this.version(1).stores({
      donaciones: '++id, codigoTemporal, estado, syncStatus, tipoAlimento, horaLimite, createdAt',
      donaciones_locales: '++localId, codigoTemporal, syncStatus, estado, createdAt',
    });
  }
}

/** Instancia única singleton de la base de datos local */
export const db = new RescateAlimentosDB();
export const RescateDatabase = RescateAlimentosDB;

/**
 * Guarda una donación en el almacenamiento local IndexedDB con estado 'PENDIENTE'
 * cuando no hay conexión a internet disponible (RNF-002).
 *
 * @param donacion Datos de la donación a almacenar localmente.
 * @returns El identificador numérico autoincremental asignado en IndexedDB.
 */
export async function guardarDonacionOffline(
  donacion: Omit<DonacionOffline, 'id' | 'localId' | 'estado' | 'syncStatus' | 'createdAt' | 'codigoTemporal'> & {
    estado?: SyncStatus;
    syncStatus?: SyncStatus;
    codigoTemporal?: string;
    createdAt?: string;
  }
): Promise<number> {
  const timestamp = Date.now();
  const registro: DonacionOffline = {
    ...donacion,
    codigoTemporal: donacion.codigoTemporal || `OFFLINE-${timestamp}`,
    estado: 'PENDIENTE',
    syncStatus: 'PENDIENTE',
    createdAt: donacion.createdAt || new Date(timestamp).toISOString(),
  };

  return await db.donaciones.add(registro);
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
  await db.donaciones.update(localId, {
    estado: 'SINCRONIZADO',
    syncStatus: 'SINCRONIZADO',
    codigoServidor,
  });
}
