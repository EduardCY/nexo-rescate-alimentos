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

/**
 * Códigos que devuelve el RPC `tomar_donacion` (CMP-03 / ADR-001).
 * 200 éxito · 400 parámetros nulos · 403 donante · 404 inexistente · 409 ya tomada · 410 no vigente.
 */
export type CodigoTomarDonacion = 200 | 400 | 403 | 404 | 409 | 410;

/** Retorno exitoso (200): datos de recogida que CA-03.1 muestra solo a quien ganó la reserva. */
export interface TomarDonacionExito {
  exito: true;
  codigo: 200;
  mensaje: string;
  donacion_id: string;
  donacion_codigo: string;
  estado: 'ASIGNADA';
  voluntario_id: string;
  voluntario_nombre: string;
  asignada_at: string;
  direccion_recogida: string;
  donante_nombre: string;
  donante_telefono: string | null;
}

/** Retorno de fallo controlado: el RPC nunca lanza excepción por reglas de negocio. */
export interface TomarDonacionFallo {
  exito: false;
  codigo: Exclude<CodigoTomarDonacion, 200>;
  mensaje: string;
}

export type TomarDonacionResultado = TomarDonacionExito | TomarDonacionFallo;
