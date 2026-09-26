/**
 * Definición de tipos fundamentales del dominio para la Red de Rescate de Alimentos.
 * Mapea los requerimientos funcionales del Módulo 1 y la especificación del MVP.
 */

export type EstadoDonacion = 
  | 'DISPONIBLE'
  | 'ASIGNADA'
  | 'ENTREGADA'
  | 'EXPIRADA'
  | 'CANCELADA';

export type RolUsuario = 
  | 'COORDINADOR'
  | 'VOLUNTARIO'
  | 'DONANTE'
  | 'RECEPTOR';

export interface Organizacion {
  id: string;
  nombre: string;
  tipo: 'DONANTE' | 'RECEPTOR' | 'FUNDACION';
  direccion: string;
  zona: 'NORTE' | 'CENTRO' | 'SUR' | 'ORIENTE' | 'LADERA';
  telefono?: string;
  tieneRefrigeracion: boolean;
  capacidadRacionesDia?: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string;
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  disponible: boolean;
}

export interface Donacion {
  id: string;
  codigo: string; // ej. DON-101
  donanteId: string;
  donanteNombre: string;
  tipoAlimento: string;
  requiereFrio: boolean;
  cantidadEstimada: number;
  unidadMedida: 'kg' | 'canastillas' | 'bultos' | 'unidades';
  direccionRecogida: string;
  horaLimite: string;
  estado: EstadoDonacion;
  voluntarioId?: string;
  voluntarioNombre?: string;
  comedorId?: string;
  comedorNombre?: string;
  exencionSanitariaAceptada: boolean;
  createdAt: string;
  asignadaAt?: string;
  entregadaAt?: string;
}
