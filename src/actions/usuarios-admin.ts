'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import { UUID_REGEX } from '@/lib/utils/uuid-helper';
import type {
  EstadoCuentaUsuario,
  ResultadoAccionAdmin,
  RolUsuario,
  UsuarioCorporativo,
} from '@/types';

/**
 * Administración corporativa de usuarios (CMP-05 / TASK-24 / CA-05.2).
 *
 * Todas las acciones son exclusivas del rol ADMIN, que equivale al permiso
 * `admin:users:write`. Los permisos granulares de un usuario NO amplían este
 * privilegio: la condición es `rol === 'ADMIN'` y cuenta ACTIVO.
 *
 * Defensa en profundidad (dos barreras independientes):
 *   1. Esta capa verifica que el actor sea ADMIN activo y responde 403 antes de validar datos.
 *   2. Las RPC `rbac_*` de PostgreSQL vuelven a verificarlo, mutan la fila y escriben
 *      `audit_rbac_eventos` en UNA sola transacción (o ocurren ambas cosas o ninguna).
 *      Solo `service_role` puede ejecutarlas; `anon` y `authenticated` no.
 *
 * LIMITACIÓN CONOCIDA (identidad del actor): el proyecto aún no tiene Supabase Auth,
 * así que `actorId` llega como parámetro y no como una sesión verificada. Cualquier
 * Server Action es un endpoint HTTP público: hasta integrar Auth, quien conozca el UUID
 * de un ADMIN podría hacerse pasar por él. Cuando exista Auth, `verificarActorAdmin`
 * debe obtener el actor del token de sesión (por ejemplo con `supabase.auth.getUser`) y
 * dejar de aceptar `actorId` desde el cliente. Ese es el único punto que debe cambiar.
 */

const MSG_FORBIDDEN = 'Forbidden: Requiere rol ADMIN';
const MSG_INACTIVO = 'Forbidden: La cuenta del administrador no está activa';
const LIMITE_LISTADO = 500;

const ROLES = ['ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR'] as const;
const ESTADOS_CUENTA = ['ACTIVO', 'SUSPENDIDO', 'PENDIENTE_AUTORIZACION'] as const;
const VEHICULOS = ['MOTO', 'CARROMOTO', 'CARRO', 'BICICLETA', 'A_PIE'] as const;

const uuidSchema = z.string().regex(UUID_REGEX, 'El identificador no es un UUID válido');
const rolSchema = z.enum(ROLES);
const motivoSchema = z
  .string()
  .trim()
  .min(3, 'El motivo debe tener al menos 3 caracteres')
  .max(500, 'El motivo no puede superar 500 caracteres');
const permisoSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z][a-z0-9_]*(:[a-z0-9_*]+)+$/, 'Formato de permiso inválido (ej. recurso:accion)');

const NuevoUsuarioSchema = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(255),
  email: z.string().trim().toLowerCase().max(255).pipe(z.email('El correo electrónico no es válido')),
  rol: rolSchema,
  telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(50),
  organizacionId: uuidSchema.optional(),
  vehiculoTipo: z.enum(VEHICULOS).optional(),
  permisosGranulares: z.array(permisoSchema).max(20).optional(),
  motivo: motivoSchema.optional(),
});

const ActualizarRolSchema = z.object({
  usuarioId: uuidSchema,
  nuevoRol: rolSchema,
  motivo: motivoSchema,
});

const CambiarEstadoSchema = z.object({
  usuarioId: uuidSchema,
  nuevoEstado: z.enum(['ACTIVO', 'SUSPENDIDO']),
  motivo: motivoSchema,
});

const FiltrosListadoSchema = z
  .object({
    rol: rolSchema.optional(),
    estadoCuenta: z.enum(ESTADOS_CUENTA).optional(),
  })
  .optional();

/** Datos para crear un usuario corporativo. */
export interface NuevoUsuarioCorporativoInput {
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string;
  organizacionId?: string;
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  permisosGranulares?: string[];
  /** Razón del alta para la bitácora. Por defecto: "Alta de usuario corporativo". */
  motivo?: string;
}

/** Filtros opcionales del listado. */
export interface FiltrosUsuariosCorporativos {
  rol?: RolUsuario;
  estadoCuenta?: EstadoCuentaUsuario;
}

type Fallo = Extract<ResultadoAccionAdmin<never>, { exito: false }>;

/** Fila de `usuarios` tal como la entrega PostgreSQL (snake_case). */
interface FilaUsuarioDb {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string;
  vehiculo_tipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE' | null;
  disponible: boolean;
  organizacion_id?: string | null;
  estado_cuenta: EstadoCuentaUsuario;
  permisos_granulares?: unknown;
  created_at: string;
}

/** Respuesta JSON de las RPC `rbac_*`. */
interface RespuestaRpcRbac {
  exito: boolean;
  codigo: number;
  mensaje: string;
  usuario?: unknown;
}

const COLUMNAS_USUARIO =
  'id, nombre, email, rol, telefono, vehiculo_tipo, disponible, organizacion_id, estado_cuenta, permisos_granulares, created_at';

function fallo(codigo: Fallo['codigo'], error: string): Fallo {
  return { exito: false, codigo, error };
}

function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Datos de entrada inválidos';
}

function esFilaUsuario(valor: unknown): valor is FilaUsuarioDb {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.nombre === 'string' &&
    typeof v.email === 'string' &&
    typeof v.rol === 'string' &&
    typeof v.estado_cuenta === 'string'
  );
}

function mapearUsuario(fila: FilaUsuarioDb): UsuarioCorporativo {
  const permisos = Array.isArray(fila.permisos_granulares)
    ? fila.permisos_granulares.filter((p): p is string => typeof p === 'string')
    : [];
  return {
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    telefono: fila.telefono,
    vehiculoTipo: fila.vehiculo_tipo ?? undefined,
    disponible: fila.disponible,
    organizacionId: fila.organizacion_id ?? undefined,
    estadoCuenta: fila.estado_cuenta,
    permisosGranulares: permisos,
    createdAt: fila.created_at,
  };
}

/**
 * Las RPC de administración solo las ejecuta `service_role`. Sin esa clave el cliente
 * caería a la clave `anon` (o a una URL simulada) y fallaría de forma confusa: aquí se
 * rechaza de forma explícita y nunca se simula un resultado en una acción de seguridad.
 */
function servidorConfigurado(): boolean {
  return esSupabaseConfigurado() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Verifica que el invocador sea ADMIN activo (permiso `admin:users:write`).
 * Devuelve `null` si está autorizado o el fallo listo para retornar.
 * Es el ÚNICO punto que debe reemplazarse cuando exista Supabase Auth (ver cabecera).
 */
async function verificarActorAdmin(supabase: SupabaseClient, actorId: unknown): Promise<Fallo | null> {
  if (typeof actorId !== 'string' || !UUID_REGEX.test(actorId)) {
    return fallo(403, MSG_FORBIDDEN);
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('rol, estado_cuenta')
    .eq('id', actorId)
    .maybeSingle();

  if (error) {
    console.error('[usuarios-admin] No se pudo verificar al actor:', error.code ?? 'sin-codigo');
    return fallo(500, 'No fue posible verificar los permisos. Intenta de nuevo.');
  }

  const actor = data as { rol: string; estado_cuenta: string } | null;
  if (!actor || actor.rol !== 'ADMIN') return fallo(403, MSG_FORBIDDEN);
  if (actor.estado_cuenta !== 'ACTIVO') return fallo(403, MSG_INACTIVO);
  return null;
}

/** Traduce la respuesta JSON de una RPC `rbac_*` al contrato de las Server Actions. */
function resolverRespuestaRpc(
  data: unknown,
  error: { code?: string } | null,
  etiqueta: string
): ResultadoAccionAdmin<UsuarioCorporativo> {
  if (error || typeof data !== 'object' || data === null) {
    console.error(`[usuarios-admin] ${etiqueta} falló:`, error?.code ?? 'respuesta-invalida');
    return fallo(500, 'No fue posible completar la operación. Intenta de nuevo.');
  }

  const rpc = data as RespuestaRpcRbac;

  if (rpc.exito === true && rpc.codigo === 200 && esFilaUsuario(rpc.usuario)) {
    return { exito: true, codigo: 200, mensaje: rpc.mensaje, data: mapearUsuario(rpc.usuario) };
  }

  if (rpc.codigo === 400 || rpc.codigo === 403 || rpc.codigo === 404 || rpc.codigo === 409) {
    return fallo(rpc.codigo, rpc.mensaje);
  }

  console.error(`[usuarios-admin] ${etiqueta}: respuesta inesperada`, rpc.codigo);
  return fallo(500, 'No fue posible completar la operación. Intenta de nuevo.');
}

/**
 * Lista los usuarios corporativos (solo ADMIN). Devuelve como máximo 500 filas,
 * de la más reciente a la más antigua; use los filtros para acotar.
 */
export async function listarUsuariosCorporativos(
  actorId: string,
  filtros?: FiltrosUsuariosCorporativos
): Promise<ResultadoAccionAdmin<UsuarioCorporativo[]>> {
  if (!servidorConfigurado()) return fallo(500, 'El servicio de administración no está configurado.');

  const supabase = createClient();
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = FiltrosListadoSchema.safeParse(filtros);
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  let consulta = supabase
    .from('usuarios')
    .select(COLUMNAS_USUARIO)
    .order('created_at', { ascending: false })
    .limit(LIMITE_LISTADO);

  if (validacion.data?.rol) consulta = consulta.eq('rol', validacion.data.rol);
  if (validacion.data?.estadoCuenta) consulta = consulta.eq('estado_cuenta', validacion.data.estadoCuenta);

  const { data, error } = await consulta;
  if (error || !Array.isArray(data)) {
    console.error('[usuarios-admin] Listado falló:', error?.code ?? 'respuesta-invalida');
    return fallo(500, 'No fue posible consultar los usuarios. Intenta de nuevo.');
  }

  const usuarios = (data as unknown[]).filter(esFilaUsuario).map(mapearUsuario);
  return { exito: true, codigo: 200, mensaje: 'Usuarios consultados correctamente.', data: usuarios };
}

/**
 * Crea un usuario corporativo (solo ADMIN). Nace con cuenta ACTIVO y deja un evento
 * `CREAR` en `audit_rbac_eventos` dentro de la misma transacción.
 */
export async function crearUsuarioCorporativo(
  actorId: string,
  datos: NuevoUsuarioCorporativoInput
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  if (!servidorConfigurado()) return fallo(500, 'El servicio de administración no está configurado.');

  const supabase = createClient();
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = NuevoUsuarioSchema.safeParse(datos);
  if (!validacion.success) return fallo(400, primerError(validacion.error));
  const d = validacion.data;

  const { data, error } = await supabase.rpc('rbac_crear_usuario', {
    p_admin_id: actorId,
    p_nombre: d.nombre,
    p_email: d.email,
    p_rol: d.rol,
    p_telefono: d.telefono,
    p_organizacion_id: d.organizacionId ?? null,
    p_vehiculo_tipo: d.vehiculoTipo ?? null,
    p_permisos_granulares: d.permisosGranulares ?? [],
    p_motivo: d.motivo ?? 'Alta de usuario corporativo',
  });

  return resolverRespuestaRpc(data, error, 'rbac_crear_usuario');
}

/**
 * Cambia el rol de un usuario (solo ADMIN) y registra `EDITAR_ROL` con el rol anterior
 * y el nuevo. No permite degradar al último administrador activo.
 */
export async function actualizarRolUsuario(
  actorId: string,
  usuarioId: string,
  nuevoRol: RolUsuario,
  motivo: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  if (!servidorConfigurado()) return fallo(500, 'El servicio de administración no está configurado.');

  const supabase = createClient();
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = ActualizarRolSchema.safeParse({ usuarioId, nuevoRol, motivo });
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  const { data, error } = await supabase.rpc('rbac_actualizar_rol', {
    p_admin_id: actorId,
    p_usuario_id: validacion.data.usuarioId,
    p_rol_nuevo: validacion.data.nuevoRol,
    p_motivo: validacion.data.motivo,
  });

  return resolverRespuestaRpc(data, error, 'rbac_actualizar_rol');
}

/**
 * Suspende o reactiva una cuenta (solo ADMIN) y registra `SUSPENDER` o `REACTIVAR`.
 * Una cuenta SUSPENDIDO no puede tomar donaciones (la RPC `tomar_donacion` la rechaza con 403).
 * Un administrador no puede suspenderse a sí mismo ni suspender al último administrador activo.
 */
export async function cambiarEstadoCuentaUsuario(
  actorId: string,
  usuarioId: string,
  nuevoEstado: 'ACTIVO' | 'SUSPENDIDO',
  motivo: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  if (!servidorConfigurado()) return fallo(500, 'El servicio de administración no está configurado.');

  const supabase = createClient();
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = CambiarEstadoSchema.safeParse({ usuarioId, nuevoEstado, motivo });
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  const { data, error } = await supabase.rpc('rbac_cambiar_estado', {
    p_admin_id: actorId,
    p_usuario_id: validacion.data.usuarioId,
    p_estado_nuevo: validacion.data.nuevoEstado,
    p_motivo: validacion.data.motivo,
  });

  return resolverRespuestaRpc(data, error, 'rbac_cambiar_estado');
}
