/**
 * Matriz canónica y motor puro de autorización para Control de Acceso Basado en Roles (RBAC).
 *
 * ¿Por qué?: RNF-003 y CMP-05 exigen una separación estricta de responsabilidades corporativas,
 * garantizando que el rol VOLUNTARIO quede confinado a sus operaciones delegadas en campo
 * (evitando fugas a reportes globales o administración) y que el rol ADMIN tenga exclusividad
 * sobre la gobernanza de usuarios y permisos.
 */

export type RolCorporativo =
  | 'ADMIN'
  | 'COORDINADOR'
  | 'VOLUNTARIO'
  | 'DONANTE'
  | 'RECEPTOR';

export type EstadoCuenta =
  | 'ACTIVO'
  | 'SUSPENDIDO'
  | 'PENDIENTE_AUTORIZACION';

export type PermisoSistema =
  | 'admin:users:read'
  | 'admin:users:write'
  | 'admin:users:suspend'
  | 'admin:rbac:assign'
  | 'reports:impact:read'
  | 'reports:impact:export'
  | 'donaciones:create'
  | 'donaciones:read'
  | 'donaciones:take'
  | 'entregas:confirm'
  | 'rastreo:public:read';

/**
 * Matriz estática inmutable de asignación de capacidades por rol.
 *
 * ¿Por qué?: Centralizar los permisos en una estructura estática y de solo lectura previene
 * escaladas de privilegios no autorizadas en tiempo de ejecución tanto en línea como fuera de línea.
 */
export const RBAC_PERMISOS: Readonly<Record<RolCorporativo, readonly PermisoSistema[]>> = Object.freeze({
  ADMIN: ([
    'admin:users:read',
    'admin:users:write',
    'admin:users:suspend',
    'admin:rbac:assign',
    'reports:impact:read',
    'reports:impact:export',
    'donaciones:create',
    'donaciones:read',
    'donaciones:take',
    'entregas:confirm',
    'rastreo:public:read',
  ] as const),
  COORDINADOR: ([
    'reports:impact:read',
    'reports:impact:export',
    'donaciones:read',
    'rastreo:public:read',
  ] as const),
  VOLUNTARIO: ([
    'donaciones:read',
    'donaciones:take',
    'entregas:confirm',
    'rastreo:public:read',
  ] as const),
  DONANTE: ([
    'donaciones:create',
    'donaciones:read',
    'rastreo:public:read',
  ] as const),
  RECEPTOR: ([
    'donaciones:read',
    'entregas:confirm',
    'rastreo:public:read',
  ] as const),
});

/**
 * Rutas operativas permitidas de forma expresa para el rol VOLUNTARIO.
 *
 * ¿Por qué?: CA-05.1 exige el confinamiento estricto del personal operativo en campo; cualquier
 * intento de ingresar a rutas administrativas o reportes consolidados debe ser rechazado.
 */
export const RUTAS_OPERATIVAS_VOLUNTARIO: readonly string[] = Object.freeze([
  '/',
  '/donaciones',
  '/ruta-activa',
  '/entregas',
  '/rastreo',
  '/~offline',
]);

/**
 * Prefijos de rutas con acceso restringido para perfiles administrativos.
 */
export const RUTAS_ADMINISTRATIVAS_EXCLUSIVAS: readonly string[] = Object.freeze([
  '/admin',
  '/admin/usuarios',
  '/configuracion',
]);

/**
 * Roles autorizados para auto-postulación en el formulario de registro público.
 * Los roles de gestión interna (ADMIN, COORDINADOR) no se pueden auto-registrar.
 */
export const ROLES_PUBLICOS_AUTORREGISTRABLES: readonly RolCorporativo[] = Object.freeze([
  'VOLUNTARIO',
  'DONANTE',
  'RECEPTOR',
]);

/**
 * Verifica si un rol pertenece a la categoría de auto-postulación pública externa.
 */
export function esRolAutoRegistrablePublico(rol: RolCorporativo): boolean {
  return ROLES_PUBLICOS_AUTORREGISTRABLES.includes(rol);
}

/**
 * Verifica si un rol tiene facultades operativas para aprobar solicitudes pendientes.
 */
export function puedeAprobarUsuarios(rol: RolCorporativo): boolean {
  return rol === 'ADMIN' || rol === 'COORDINADOR';
}

/**
 * Verifica si un rol tiene autorización para eliminar nodos (comedores/donaciones) del mapa.
 */
export function puedeEliminarNodos(rol: RolCorporativo): boolean {
  return rol === 'ADMIN' || rol === 'COORDINADOR';
}

/**
 * Valida si un rol corporativo posee un permiso específico en el sistema.
 *
 * ¿Por qué?: Los usuarios con estado SUSPENDIDO o PENDIENTE_AUTORIZACION deben ver revocadas
 * sus facultades operativas de inmediato para salvaguardar la inocuidad y la trazabilidad.
 *
 * @param rol Rol del usuario a evaluar.
 * @param permiso Permiso solicitado para la operación.
 * @param estadoCuenta Estado de la cuenta del usuario (por defecto 'ACTIVO').
 * @returns Verdadero si el rol ostenta el permiso y la cuenta se encuentra activa.
 */
export function tienePermiso(
  rol: RolCorporativo,
  permiso: PermisoSistema,
  estadoCuenta: EstadoCuenta = 'ACTIVO'
): boolean {
  if (estadoCuenta !== 'ACTIVO') {
    return false;
  }

  const permisosRol = RBAC_PERMISOS[rol];
  if (!permisosRol) {
    return false;
  }

  return permisosRol.includes(permiso);
}

/**
 * Determina si un usuario con determinado rol puede acceder a una ruta de la aplicación.
 *
 * ¿Por qué?: Este helper puro es consumido por el middleware de Next.js, por las guardas de cliente
 * y por los scripts de CI para asegurar coherencia semántica en los tres niveles de protección.
 *
 * @param rol Rol del usuario en sesión.
 * @param pathname Ruta relativa solicitada (ej. '/admin/usuarios').
 * @param estadoCuenta Estado de la cuenta.
 * @returns Verdadero si la navegación está autorizada para dicho perfil.
 */
export function puedeAccederRuta(
  rol: RolCorporativo,
  pathname: string,
  estadoCuenta: EstadoCuenta = 'ACTIVO'
): boolean {
  // Cuentas suspendidas o no activas no tienen acceso a rutas operativas
  if (estadoCuenta !== 'ACTIVO') {
    return false;
  }

  // Normalizar ruta eliminando trailing slash y querystrings
  const rutaLimpia = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  // 1. Módulo de Administración de Usuarios: accesible para ADMIN y COORDINADOR (Mesa Común)
  if (rutaLimpia.startsWith('/admin/usuarios')) {
    return rol === 'ADMIN' || rol === 'COORDINADOR';
  }

  // Rutas administrativas generales y de configuración reservadas exclusivamente para ADMIN (CA-05.2)
  if (rutaLimpia.startsWith('/admin') || rutaLimpia.startsWith('/configuracion')) {
    return rol === 'ADMIN';
  }

  // 2. Panel de Impacto y Métricas reservado para administración y coordinación
  if (rutaLimpia.startsWith('/impacto')) {
    return rol === 'ADMIN' || rol === 'COORDINADOR';
  }

  // 3. Donar reservado exclusivamente para DONANTE y ADMIN (Aislamiento Estricto EatCloud)
  if (rutaLimpia.startsWith('/donar')) {
    return rol === 'DONANTE' || rol === 'ADMIN';
  }

  // 4. Ruta Activa reservada para VOLUNTARIO, RECEPTOR (transporte propio del comedor), COORDINADOR y ADMIN
  if (rutaLimpia.startsWith('/ruta-activa')) {
    return rol === 'VOLUNTARIO' || rol === 'RECEPTOR' || rol === 'COORDINADOR' || rol === 'ADMIN';
  }

  // 5. Entregas reservado para RECEPTOR, VOLUNTARIO, COORDINADOR y ADMIN
  if (rutaLimpia.startsWith('/entregas')) {
    return rol === 'RECEPTOR' || rol === 'VOLUNTARIO' || rol === 'COORDINADOR' || rol === 'ADMIN';
  }

  // 6. Confinamiento específico del rol VOLUNTARIO (CA-05.1)
  if (rol === 'VOLUNTARIO') {
    return RUTAS_OPERATIVAS_VOLUNTARIO.some(
      (base) => rutaLimpia === base || (base !== '/' && rutaLimpia.startsWith(base))
    );
  }

  // 7. Catálogo de donaciones disponible para todos los roles activos
  if (rutaLimpia.startsWith('/donaciones') || rutaLimpia === '/' || rutaLimpia.startsWith('/rastreo')) {
    return true;
  }

  return true;
}
