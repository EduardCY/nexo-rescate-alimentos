import Dexie, { type Table } from 'dexie';

/**
 * Entidad de almacenamiento local para donaciones registradas sin conectividad celular (RNF-002 / CA-01.5).
 */
export interface DonacionOffline {
  id?: number;
  tipoAlimento: string;
  cantidadEstimada: number;
  unidadMedida: string;
  direccionRecogida: string;
  horaLimite: string;
  requiereFrio: boolean;
  exencionSanitariaAceptada: boolean;
  estado: 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';
  createdAt?: string;
  donanteId?: string;
  donanteNombre?: string;
}

/**
 * Base de datos IndexedDB local motorizada por Dexie.js para la arquitectura Offline-First de la PWA.
 */
export class RescateDatabase extends Dexie {
  donaciones!: Table<DonacionOffline, number>;

  constructor() {
    super('NexoRescateAlimentosDB');
    this.version(1).stores({
      donaciones: '++id, estado, tipoAlimento, horaLimite',
    });
  }
}

export const db = new RescateDatabase();
