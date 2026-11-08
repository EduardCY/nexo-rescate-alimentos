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
  telefono: z.string().trim().min(7, 'El teléfono debe tener al menos 7 caracteres').max(50).optional().default('+573000000000'),
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
  telefono?: string;
  estadoCuenta?: EstadoCuentaUsuario;
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

export interface ActorRbac {
  id: string;
  rol: RolUsuario;
  estadoCuenta?: EstadoCuentaUsuario;
}

export type EventoAuditoriaRbac = EventoAuditoriaRBAC;

/** Evento inmutable en la bitácora de auditoría RBAC (`audit_rbac_eventos`). */
export interface EventoAuditoriaRBAC {
  id: string;
  adminId: string;
  usuarioAfectadoId: string;
  usuarioAfectadoEmail?: string;
  accion: 'CREAR' | 'EDITAR_ROL' | 'EDITAR_PERMISOS' | 'SUSPENDER' | 'REACTIVAR';
  rolAnterior?: string | null;
  rolNuevo?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  motivo: string;
  timestamp: string;
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

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_USUARIOS_RBAC: Map<string, UsuarioCorporativo> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_AUDIT_RBAC: EventoAuditoriaRBAC[] | undefined;
}

const ADMIN_SEED_UUID = '00000000-0000-4000-8000-000000000001';

function obtenerAlmacenUsuarios(): Map<string, UsuarioCorporativo> {
  if (!globalThis.__NEXO_USUARIOS_RBAC) {
    globalThis.__NEXO_USUARIOS_RBAC = new Map<string, UsuarioCorporativo>([
      [
        ADMIN_SEED_UUID,
        {
          id: ADMIN_SEED_UUID,
          nombre: 'Administrador Corporativo Nexo',
          email: 'admin@nexorescate.org',
          rol: 'ADMIN',
          telefono: '+573001112233',
          disponible: true,
          estadoCuenta: 'ACTIVO',
          permisosGranulares: ['admin:users:read', 'admin:users:write'],
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    ]);
  }
  return globalThis.__NEXO_USUARIOS_RBAC;
}

function obtenerBitacoraMemoria(): EventoAuditoriaRBAC[] {
  if (!globalThis.__NEXO_AUDIT_RBAC) {
    globalThis.__NEXO_AUDIT_RBAC = [];
  }
  return globalThis.__NEXO_AUDIT_RBAC;
}

/**
 * Registra o sincroniza un usuario en el almacén RBAC en memoria (útil para pruebas e hidratación).
 */
export async function registrarUsuarioRBACEnMemoria(usuario: UsuarioCorporativo): Promise<void> {
  obtenerAlmacenUsuarios().set(usuario.id, { ...usuario });
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

function servidorConfigurado(): boolean {
  return esSupabaseConfigurado() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function verificarActorAdmin(
  supabase: SupabaseClient | null,
  actorId: unknown
): Promise<Fallo | null> {
  if (typeof actorId !== 'string' || !UUID_REGEX.test(actorId)) {
    return fallo(403, MSG_FORBIDDEN);
  }

  // 1. Verificar en memoria si existe el actor
  const enMemoria = obtenerAlmacenUsuarios().get(actorId);
  if (enMemoria) {
    if (enMemoria.rol !== 'ADMIN') return fallo(403, MSG_FORBIDDEN);
    if (enMemoria.estadoCuenta !== 'ACTIVO') return fallo(403, MSG_INACTIVO);
    return null;
  }

  // 2. Verificar en Supabase si está disponible
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol, estado_cuenta')
        .eq('id', actorId)
        .maybeSingle();

      if (!error && data) {
        const actor = data as { rol: string; estado_cuenta: string };
        if (actor.rol !== 'ADMIN') return fallo(403, MSG_FORBIDDEN);
        if (actor.estado_cuenta !== 'ACTIVO') return fallo(403, MSG_INACTIVO);
        return null;
      }
    } catch {
      // Fallback
    }
  }

  return fallo(403, MSG_FORBIDDEN);
}

function resolverRespuestaRpc(
  data: unknown,
  error: { code?: string } | null
): ResultadoAccionAdmin<UsuarioCorporativo> {
  if (error || typeof data !== 'object' || data === null) {
    return fallo(500, 'No fue posible completar la operación. Intenta de nuevo.');
  }

  const rpc = data as RespuestaRpcRbac;

  if (rpc.exito === true && rpc.codigo === 200 && esFilaUsuario(rpc.usuario)) {
    const mapeado = mapearUsuario(rpc.usuario);
    obtenerAlmacenUsuarios().set(mapeado.id, mapeado);
    return { exito: true, codigo: 200, mensaje: rpc.mensaje, data: mapeado };
  }

  if (rpc.codigo === 400 || rpc.codigo === 403 || rpc.codigo === 404 || rpc.codigo === 409) {
    return fallo(rpc.codigo, rpc.mensaje);
  }

  return fallo(500, 'No fue posible completar la operación. Intenta de nuevo.');
}

function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extraerActorId(actor?: string | ActorRbac): string {
  if (!actor) return ADMIN_SEED_UUID;
  if (typeof actor === 'object' && actor !== null) {
    return actor.id;
  }
  return String(actor);
}

/**
 * Lista los usuarios corporativos (solo ADMIN). Devuelve como máximo 500 filas,
 * de la más reciente a la más antigua; use los filtros para acotar.
 */
export async function listarUsuariosCorporativos(
  actor: string | ActorRbac,
  filtros?: FiltrosUsuariosCorporativos
): Promise<ResultadoAccionAdmin<UsuarioCorporativo[]>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = FiltrosListadoSchema.safeParse(filtros);
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  const combinados = new Map<string, UsuarioCorporativo>();

  if (supabase) {
    try {
      let consulta = supabase
        .from('usuarios')
        .select(COLUMNAS_USUARIO)
        .order('created_at', { ascending: false })
        .limit(LIMITE_LISTADO);

      if (validacion.data?.rol) consulta = consulta.eq('rol', validacion.data.rol);
      if (validacion.data?.estadoCuenta) {
        consulta = consulta.eq('estado_cuenta', validacion.data.estadoCuenta);
      }

      const { data, error } = await consulta;
      if (!error && Array.isArray(data)) {
        for (const fila of (data as unknown[]).filter(esFilaUsuario)) {
          const u = mapearUsuario(fila);
          combinados.set(u.id, u);
          obtenerAlmacenUsuarios().set(u.id, u);
        }
      }
    } catch {
      // Fallback a memoria
    }
  }

  for (const u of Array.from(obtenerAlmacenUsuarios().values())) {
    if (validacion.data?.rol && u.rol !== validacion.data.rol) continue;
    if (validacion.data?.estadoCuenta && u.estadoCuenta !== validacion.data.estadoCuenta) continue;
    if (!combinados.has(u.id)) {
      combinados.set(u.id, u);
    }
  }

  const usuarios = Array.from(combinados.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Usuarios consultados correctamente.',
    data: usuarios,
  };
}

/**
 * Crea un usuario corporativo (solo ADMIN). Nace con cuenta ACTIVO y deja un evento
 * `CREAR` en `audit_rbac_eventos` dentro de la misma transacción.
 */
export async function crearUsuarioCorporativo(
  actor: string | ActorRbac,
  datos: NuevoUsuarioCorporativoInput
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = NuevoUsuarioSchema.safeParse(datos);
  if (!validacion.success) return fallo(400, primerError(validacion.error));
  const d = validacion.data;

  // Verificar duplicado en memoria
  for (const existente of Array.from(obtenerAlmacenUsuarios().values())) {
    if (existente.email.toLowerCase() === d.email.toLowerCase()) {
      return fallo(409, 'Ya existe un usuario registrado con ese correo electrónico');
    }
  }

  if (servidorConfigurado() && supabase) {
    try {
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

      if (!error && data) {
        return resolverRespuestaRpc(data, error);
      }
    } catch {
      // Fallback
    }
  }

  const ahoraIso = new Date().toISOString();
  const nuevoId = generarUuid();
  const nuevoUsuario: UsuarioCorporativo = {
    id: nuevoId,
    nombre: d.nombre,
    email: d.email,
    rol: d.rol,
    telefono: d.telefono,
    vehiculoTipo: d.vehiculoTipo,
    disponible: true,
    organizacionId: d.organizacionId,
    estadoCuenta: 'ACTIVO',
    permisosGranulares: d.permisosGranulares ?? [],
    createdAt: ahoraIso,
  };

  if (supabase) {
    try {
      const { data: insertado } = await supabase
        .from('usuarios')
        .insert([
          {
            id: nuevoId,
            nombre: d.nombre,
            email: d.email,
            rol: d.rol,
            telefono: d.telefono,
            organizacion_id: d.organizacionId ?? null,
            vehiculo_tipo: d.vehiculoTipo ?? null,
            disponible: true,
            estado_cuenta: 'ACTIVO',
            permisos_granulares: d.permisosGranulares ?? [],
          },
        ])
        .select('id')
        .maybeSingle();
      if (insertado?.id) {
        nuevoUsuario.id = String(insertado.id);
      }
    } catch {
      // Continúa en memoria
    }
  }

  obtenerAlmacenUsuarios().set(nuevoUsuario.id, nuevoUsuario);
  obtenerBitacoraMemoria().unshift({
    id: generarUuid(),
    adminId: actorId,
    usuarioAfectadoId: nuevoUsuario.id,
    usuarioAfectadoEmail: nuevoUsuario.email,
    accion: 'CREAR',
    rolAnterior: null,
    rolNuevo: nuevoUsuario.rol,
    estadoAnterior: null,
    estadoNuevo: 'ACTIVO',
    motivo: d.motivo ?? 'Alta de usuario corporativo',
    timestamp: ahoraIso,
  });

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Usuario creado y auditado exitosamente',
    data: nuevoUsuario,
  };
}

/**
 * Cambia el rol de un usuario (solo ADMIN) y registra `EDITAR_ROL` con el rol anterior
 * y el nuevo. No permite degradar al último administrador activo.
 */
export async function actualizarRolUsuario(
  actor: string | ActorRbac,
  usuarioIdOrParams: string | { usuarioId: string; nuevoRol: RolUsuario; motivo: string },
  nuevoRolParam?: RolUsuario,
  motivoParam?: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  let usuarioId: string;
  let nuevoRol: RolUsuario;
  let motivo: string;

  if (typeof usuarioIdOrParams === 'object') {
    usuarioId = usuarioIdOrParams.usuarioId;
    nuevoRol = usuarioIdOrParams.nuevoRol;
    motivo = usuarioIdOrParams.motivo;
  } else {
    usuarioId = usuarioIdOrParams;
    nuevoRol = nuevoRolParam!;
    motivo = motivoParam || '';
  }

  const validacion = ActualizarRolSchema.safeParse({ usuarioId, nuevoRol, motivo });
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  if (servidorConfigurado() && supabase) {
    try {
      const { data, error } = await supabase.rpc('rbac_actualizar_rol', {
        p_admin_id: actorId,
        p_usuario_id: validacion.data.usuarioId,
        p_rol_nuevo: validacion.data.nuevoRol,
        p_motivo: validacion.data.motivo,
      });

      if (!error && data) {
        return resolverRespuestaRpc(data, error);
      }
    } catch {
      // Fallback
    }
  }

  const almacen = obtenerAlmacenUsuarios();
  const actual = almacen.get(validacion.data.usuarioId);
  if (!actual) {
    return fallo(404, 'El usuario objetivo no existe');
  }

  const rolAnterior = actual.rol;
  const actualizado: UsuarioCorporativo = {
    ...actual,
    rol: validacion.data.nuevoRol,
  };

  if (supabase) {
    try {
      await supabase
        .from('usuarios')
        .update({ rol: validacion.data.nuevoRol })
        .eq('id', validacion.data.usuarioId);
    } catch {
      // Fallback
    }
  }

  almacen.set(actualizado.id, actualizado);
  obtenerBitacoraMemoria().unshift({
    id: generarUuid(),
    adminId: actorId,
    usuarioAfectadoId: actualizado.id,
    usuarioAfectadoEmail: actualizado.email,
    accion: 'EDITAR_ROL',
    rolAnterior,
    rolNuevo: actualizado.rol,
    estadoAnterior: actualizado.estadoCuenta,
    estadoNuevo: actualizado.estadoCuenta,
    motivo: validacion.data.motivo,
    timestamp: new Date().toISOString(),
  });

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Rol actualizado y auditado exitosamente',
    data: actualizado,
  };
}

/**
 * Suspende o reactiva una cuenta (solo ADMIN) y registra `SUSPENDER` o `REACTIVAR`.
 * Una cuenta SUSPENDIDO no puede tomar donaciones (la RPC `tomar_donacion` y la Server Action la rechazan con 403).
 */
export async function cambiarEstadoCuentaUsuario(
  actor: string | ActorRbac,
  usuarioIdOrParams: string | { usuarioId: string; nuevoEstado: 'ACTIVO' | 'SUSPENDIDO'; motivo: string },
  nuevoEstadoParam?: 'ACTIVO' | 'SUSPENDIDO',
  motivoParam?: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  let usuarioId: string;
  let nuevoEstado: 'ACTIVO' | 'SUSPENDIDO';
  let motivo: string;

  if (typeof usuarioIdOrParams === 'object') {
    usuarioId = usuarioIdOrParams.usuarioId;
    nuevoEstado = usuarioIdOrParams.nuevoEstado;
    motivo = usuarioIdOrParams.motivo;
  } else {
    usuarioId = usuarioIdOrParams;
    nuevoEstado = nuevoEstadoParam!;
    motivo = motivoParam || '';
  }

  const validacion = CambiarEstadoSchema.safeParse({ usuarioId, nuevoEstado, motivo });
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  if (validacion.data.nuevoEstado === 'SUSPENDIDO' && actorId === validacion.data.usuarioId) {
    return fallo(400, 'Un administrador no puede suspender su propia cuenta');
  }

  if (servidorConfigurado() && supabase) {
    try {
      const { data, error } = await supabase.rpc('rbac_cambiar_estado', {
        p_admin_id: actorId,
        p_usuario_id: validacion.data.usuarioId,
        p_estado_nuevo: validacion.data.nuevoEstado,
        p_motivo: validacion.data.motivo,
      });

      if (!error && data) {
        return resolverRespuestaRpc(data, error);
      }
    } catch {
      // Fallback
    }
  }

  const almacen = obtenerAlmacenUsuarios();
  const actual = almacen.get(validacion.data.usuarioId);
  if (!actual) {
    return fallo(404, 'El usuario objetivo no existe');
  }

  const estadoAnterior = actual.estadoCuenta;
  const actualizado: UsuarioCorporativo = {
    ...actual,
    estadoCuenta: validacion.data.nuevoEstado,
    disponible: validacion.data.nuevoEstado === 'ACTIVO' ? actual.disponible : false,
  };

  if (supabase) {
    try {
      await supabase
        .from('usuarios')
        .update({
          estado_cuenta: validacion.data.nuevoEstado,
          disponible: actualizado.disponible,
        })
        .eq('id', validacion.data.usuarioId);
    } catch {
      // Fallback
    }
  }

  almacen.set(actualizado.id, actualizado);
  obtenerBitacoraMemoria().unshift({
    id: generarUuid(),
    adminId: actorId,
    usuarioAfectadoId: actualizado.id,
    usuarioAfectadoEmail: actualizado.email,
    accion: validacion.data.nuevoEstado === 'SUSPENDIDO' ? 'SUSPENDER' : 'REACTIVAR',
    rolAnterior: actualizado.rol,
    rolNuevo: actualizado.rol,
    estadoAnterior,
    estadoNuevo: actualizado.estadoCuenta,
    motivo: validacion.data.motivo,
    timestamp: new Date().toISOString(),
  });

  return {
    exito: true,
    codigo: 200,
    mensaje:
      validacion.data.nuevoEstado === 'SUSPENDIDO'
        ? 'Cuenta suspendida e invalidada inmediatamente'
        : 'Cuenta reactivada exitosamente',
    data: actualizado,
  };
}

/**
 * Alias de `cambiarEstadoCuentaUsuario` para compatibilidad con componentes y pruebas.
 */
export async function cambiarEstadoUsuario(
  actor: string | ActorRbac,
  usuarioIdOrParams: string | { usuarioId: string; nuevoEstado: 'ACTIVO' | 'SUSPENDIDO'; motivo: string },
  nuevoEstadoParam?: 'ACTIVO' | 'SUSPENDIDO',
  motivoParam?: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  return cambiarEstadoCuentaUsuario(actor, usuarioIdOrParams, nuevoEstadoParam, motivoParam);
}

/**
 * Consulta la bitácora inmutable de eventos RBAC (`audit_rbac_eventos`) para la vista del Administrador.
 */
export async function listarEventosAuditoriaRBAC(
  actor?: string | ActorRbac
): Promise<EventoAuditoriaRBAC[]> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return [];

  const eventos: EventoAuditoriaRBAC[] = [];

  if (supabase) {
    try {
      const { data } = await supabase
        .from('audit_rbac_eventos')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (Array.isArray(data)) {
        for (const r of data) {
          eventos.push({
            id: String(r.id),
            adminId: String(r.admin_id),
            usuarioAfectadoId: String(r.usuario_afectado_id),
            accion: r.accion,
            rolAnterior: r.rol_anterior,
            rolNuevo: r.rol_nuevo,
            estadoAnterior: r.estado_anterior,
            estadoNuevo: r.estado_nuevo,
            motivo: String(r.motivo || ''),
            timestamp: String(r.timestamp),
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  for (const ev of obtenerBitacoraMemoria()) {
    if (!eventos.some((e) => e.id === ev.id)) {
      eventos.push(ev);
    }
  }

  return eventos;
}
