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
  | 'ADMIN'
  | 'COORDINADOR'
  | 'VOLUNTARIO'
  | 'DONANTE'
  | 'RECEPTOR';

/**
 * Estado de la cuenta (CMP-05 / CA-05.2). Solo una cuenta `ACTIVO` puede operar:
 * una cuenta `SUSPENDIDO` o `PENDIENTE_AUTORIZACION` no puede tomar donaciones.
 */
export type EstadoCuentaUsuario = 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION';

/** Permisos protegidos del modelo RBAC. `admin:users:write` es exclusivo del rol ADMIN. */
export type PermisoRBAC = 'admin:users:read' | 'admin:users:write';

export type ZonaCali = 'NORTE' | 'CENTRO' | 'SUR' | 'ORIENTE' | 'LADERA';
export type ZonaFiltro = 'TODAS' | ZonaCali;

/**
 * Coordenadas geográficas decimales WGS84 para cartografía OpenStreetMap.
 */
export interface CoordenadaGeo {
  lat: number;
  lng: number;
}

/**
 * Alcance logístico del transporte y cobertura geográfica.
 * Permite operar hoy en el perímetro urbano de Cali y escalar a rutas intermunicipales/regionales.
 */
export type AlcanceLogistico = 'URBANO' | 'METROPOLITANO' | 'INTERMUNICIPAL';

export interface Organizacion {
  id: string;
  nombre: string;
  tipo: 'DONANTE' | 'RECEPTOR' | 'FUNDACION';
  direccion: string;
  zona: ZonaCali;
  municipio?: string;
  coordenadas?: CoordenadaGeo;
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
  /** Opcionales para no romper el código existente; el servidor siempre los entrega (CMP-05). */
  estadoCuenta?: EstadoCuentaUsuario;
  permisosGranulares?: string[];
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
  indicacionesPuesto?: string;
  telefonoDonante?: string;
  zona?: ZonaCali;
  municipio?: string;
  coordenadas?: CoordenadaGeo;
  alcance?: AlcanceLogistico;
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

// ---------------------------------------------------------------------------
// CMP-05 · RBAC corporativo y sesión offline firmada (TASK-24)
// ---------------------------------------------------------------------------

/** Usuario tal como lo devuelven las Server Actions de administración (nunca incluye secretos). */
export interface UsuarioCorporativo {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string;
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  disponible: boolean;
  organizacionId?: string;
  estadoCuenta: EstadoCuentaUsuario;
  permisosGranulares: string[];
  createdAt: string;
}

/** Retorno uniforme de las Server Actions de administración. Nunca lanzan por reglas de negocio. */
export type ResultadoAccionAdmin<T> =
  | { exito: true; codigo: 200; mensaje: string; data: T }
  | { exito: false; codigo: 400 | 403 | 404 | 409 | 500; error: string };

/**
 * Perfil RBAC persistido en el store `sesion_rbac` de IndexedDB (CA-05.3).
 * `signatureHash` es un HMAC-SHA256 en hexadecimal que protege su integridad;
 * `expiresAt` e `issuedAt` son milisegundos Unix (UTC). TTL: 24 horas.
 */
export interface SesionRBACOffline {
  userId: string;
  rol: RolUsuario;
  estadoCuenta: EstadoCuentaUsuario;
  permisos: PermisoRBAC[];
  issuedAt: number;
  expiresAt: number;
  signatureHash: string;
}

/** Causas por las que una sesión offline se considera inválida (y se revoca). */
export type MotivoSesionOfflineInvalida =
  | 'SIN_SESION'
  | 'ENTORNO_NO_SOPORTADO'
  | 'CLAVE_NO_DISPONIBLE'
  | 'FORMATO_INVALIDO'
  | 'FIRMA_INVALIDA'
  | 'EXPIRADA'
  | 'RELOJ_INCONSISTENTE'
  | 'CUENTA_NO_ACTIVA';

/** Resultado de `validarSesionRBACOffline`. Si no es válida, `permisos` siempre es `[]`. */
export type ResultadoValidacionSesionOffline =
  | { valida: true; sesion: SesionRBACOffline; permisos: PermisoRBAC[]; restanteMs: number }
  | { valida: false; motivo: MotivoSesionOfflineInvalida; permisos: [] };
