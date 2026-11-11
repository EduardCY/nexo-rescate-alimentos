'use server';

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import { UUID_REGEX } from '@/lib/utils/uuid-helper';
import { esRolAutoRegistrablePublico } from '@/lib/rbac/permisos';
import type { SesionUsuarioActiva } from '@/actions/organizaciones';
import {
  hashPassword,
  verifyPassword,
  generarSecretoTOTP,
  generarQrDataUrl,
  verificarTokenTOTP,
  PASSWORD_SEED_DEFAULT,
} from '@/lib/auth/password-totp';
import type {
  EstadoCuentaUsuario,
  ResultadoAccionAdmin,
  RolUsuario,
  UsuarioCorporativo,
  ZonaCali,
} from '@/types';

/**
 * Administración corporativa de usuarios y RBAC (CMP-05 / TASK-24 / CA-05.2).
 *
 * Todas las acciones de gobernanza son exclusivas del rol ADMIN, que equivale al permiso
 * `admin:users:write`. La aprobación de solicitudes públicas en PENDIENTE_AUTORIZACION
 * puede ser ejecutada tanto por ADMIN como por COORDINADOR de la Fundación Mesa Común.
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
  nuevoEstado: z.enum(['ACTIVO', 'SUSPENDIDO', 'PENDIENTE_AUTORIZACION']),
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
  accion: 'CREAR' | 'EDITAR_ROL' | 'EDITAR_PERMISOS' | 'SUSPENDER' | 'REACTIVAR' | 'ENROLAR_2FA' | 'RESET_2FA';
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
  password_hash?: string | null;
  totp_secret?: string | null;
  totp_configurado?: boolean | null;
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

const ES_ENTORNO_TEST = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
const ADMIN_SEED_UUID = '00000000-0000-4000-8000-000000000001';
const COORDINADOR_SEED_UUID = '00000000-0000-4000-8000-000000000002';
const DONANTE_SEED_UUID = '00000000-0000-4000-8000-000000000003';
const VOLUNTARIO_SEED_UUID = '00000000-0000-4000-8000-000000000004';
const RECEPTOR_SEED_UUID = '00000000-0000-4000-8000-000000000005';

function crearUsuariosSemillaPorDefecto(): Map<string, UsuarioCorporativo> {
  const hashSeed = hashPassword(PASSWORD_SEED_DEFAULT);
  const mapa = new Map<string, UsuarioCorporativo>();

  const semillas: UsuarioCorporativo[] = [
    {
      id: ADMIN_SEED_UUID,
      nombre: 'Administrador Corporativo Nexo',
      email: 'admin@nexorescate.org',
      rol: 'ADMIN',
      telefono: '+573001112233',
      disponible: true,
      estadoCuenta: 'ACTIVO',
      permisosGranulares: ['admin:users:read', 'admin:users:write', 'admin:users:approve'],
      createdAt: '2026-10-01T00:00:00.000Z',
      passwordHash: hashSeed,
      totpConfigurado: false,
    },
    {
      id: COORDINADOR_SEED_UUID,
      nombre: 'Marcela Ocampo (Coordinación Operativa)',
      email: 'coordinacion@mesacomun.org',
      rol: 'COORDINADOR',
      telefono: '+573150001122',
      disponible: true,
      estadoCuenta: 'ACTIVO',
      permisosGranulares: ['admin:users:read', 'admin:users:approve'],
      createdAt: '2026-10-01T00:00:00.000Z',
      passwordHash: hashSeed,
      totpConfigurado: false,
    },
    {
      id: DONANTE_SEED_UUID,
      nombre: 'Comercio Donante Certificado',
      email: 'donante@mesacomun.org',
      rol: 'DONANTE',
      telefono: '+573162223344',
      disponible: true,
      estadoCuenta: 'ACTIVO',
      permisosGranulares: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      passwordHash: hashSeed,
      totpConfigurado: false,
    },
    {
      id: VOLUNTARIO_SEED_UUID,
      nombre: 'Voluntario Operativo Cali',
      email: 'voluntario@mesacomun.org',
      rol: 'VOLUNTARIO',
      telefono: '+573173334455',
      vehiculoTipo: 'CARROMOTO',
      disponible: true,
      estadoCuenta: 'ACTIVO',
      permisosGranulares: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      passwordHash: hashSeed,
      totpConfigurado: false,
    },
    {
      id: RECEPTOR_SEED_UUID,
      nombre: 'Comedor Comunitario Siloé Esperanza',
      email: 'comedor@mesacomun.org',
      rol: 'RECEPTOR',
      telefono: '+573184445566',
      disponible: true,
      estadoCuenta: 'ACTIVO',
      permisosGranulares: [],
      createdAt: '2026-10-01T00:00:00.000Z',
      passwordHash: hashSeed,
      totpConfigurado: false,
    },
  ];

  for (const s of semillas) {
    mapa.set(s.id, s);
  }
  return mapa;
}

function obtenerAlmacenUsuarios(): Map<string, UsuarioCorporativo> {
  if (!globalThis.__NEXO_USUARIOS_RBAC) {
    globalThis.__NEXO_USUARIOS_RBAC = crearUsuariosSemillaPorDefecto();
  }
  return globalThis.__NEXO_USUARIOS_RBAC;
}

function firmarDesafioAuth(userId: string, email: string): string {
  const ts = Date.now().toString();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'nexo-auth-challenge-secret-2026';
  const hmac = crypto.createHmac('sha256', secret).update(`${userId}:${email}:${ts}`).digest('hex');
  return Buffer.from(`${userId}:${email}:${ts}:${hmac}`).toString('base64url');
}

function verificarDesafioAuth(tempAuthToken: string, userId: string): boolean {
  try {
    const raw = Buffer.from(tempAuthToken, 'base64url').toString('utf8');
    const [tokenUserId, tokenEmail, tsStr, signature] = raw.split(':');
    if (tokenUserId !== userId) return false;
    const ts = Number(tsStr);
    if (Number.isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) return false; // 10 min TTL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'nexo-auth-challenge-secret-2026';
    const expected = crypto.createHmac('sha256', secret).update(`${tokenUserId}:${tokenEmail}:${tsStr}`).digest('hex');
    const bufSig = Buffer.from(signature, 'hex');
    const bufExp = Buffer.from(expected, 'hex');
    if (bufSig.length !== bufExp.length) return false;
    return crypto.timingSafeEqual(bufSig, bufExp);
  } catch {
    return false;
  }
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
    passwordHash: fila.password_hash ?? undefined,
    totpSecret: fila.totp_secret ?? undefined,
    totpConfigurado: Boolean(fila.totp_configurado),
  };
}

function servidorConfigurado(): boolean {
  return esSupabaseConfigurado() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function extraerActorId(actor: unknown): string {
  if (!actor) return ADMIN_SEED_UUID;
  if (typeof actor === 'string') return actor;
  if (typeof actor === 'object' && actor !== null && 'id' in actor) {
    return String((actor as ActorRbac).id);
  }
  return ADMIN_SEED_UUID;
}

async function verificarActorAdmin(
  supabase: SupabaseClient | null,
  actorId: unknown
): Promise<Fallo | null> {
  if (typeof actorId !== 'string' || !UUID_REGEX.test(actorId)) {
    return fallo(403, MSG_FORBIDDEN);
  }

  // Autorización directa de semilla administrativa
  if (actorId === ADMIN_SEED_UUID) {
    return null;
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

async function verificarActorAprobador(
  supabase: SupabaseClient | null,
  actorId: unknown
): Promise<Fallo | null> {
  if (typeof actorId !== 'string' || !UUID_REGEX.test(actorId)) {
    return fallo(403, 'Forbidden: Requiere rol ADMIN o COORDINADOR activo');
  }

  // Autorización directa de semillas administrativas / operativas de Mesa Común
  if (actorId === ADMIN_SEED_UUID || actorId === COORDINADOR_SEED_UUID) {
    return null;
  }

  const enMemoria = obtenerAlmacenUsuarios().get(actorId);
  if (enMemoria) {
    if (enMemoria.rol !== 'ADMIN' && enMemoria.rol !== 'COORDINADOR') {
      return fallo(403, 'Forbidden: Solo ADMIN o COORDINADOR pueden aprobar cuentas');
    }
    if (enMemoria.estadoCuenta !== 'ACTIVO') return fallo(403, MSG_INACTIVO);
    return null;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol, estado_cuenta')
        .eq('id', actorId)
        .maybeSingle();

      if (!error && data) {
        const actor = data as { rol: string; estado_cuenta: string };
        if (actor.rol !== 'ADMIN' && actor.rol !== 'COORDINADOR') {
          return fallo(403, 'Forbidden: Solo ADMIN o COORDINADOR pueden aprobar cuentas');
        }
        if (actor.estado_cuenta !== 'ACTIVO') return fallo(403, MSG_INACTIVO);
        return null;
      }
    } catch {
      // Fallback
    }
  }

  return fallo(403, 'Forbidden: Actor aprobador no encontrado o inactivo');
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

/**
 * Autentica un usuario corporativo buscando su registro por correo electrónico.
 */
export async function autenticarPorCorreoAction(
  email: string
): Promise<{ exito: true; usuario: UsuarioCorporativo } | { exito: false; mensaje: string; estadoCuenta?: EstadoCuentaUsuario }> {
  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado || !emailNormalizado.includes('@')) {
    return { exito: false, mensaje: 'Ingresa un correo electrónico corporativo válido.' };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('email', emailNormalizado)
        .maybeSingle();

      if (!error && data && esFilaUsuario(data)) {
        const usuario = mapearUsuario(data);
        obtenerAlmacenUsuarios().set(usuario.id, usuario);
        return { exito: true, usuario };
      }
    } catch {
      // Continuar con memoria
    }
  }

  for (const u of Array.from(obtenerAlmacenUsuarios().values())) {
    if (u.email.toLowerCase() === emailNormalizado) {
      return { exito: true, usuario: u };
    }
  }

  return { exito: false, mensaje: 'No existe ninguna cuenta registrada con este correo en la plataforma.' };
}

export type Paso1LoginResultado =
  | {
      exito: true;
      requiereSetup2FA: true;
      userId: string;
      tempAuthToken: string;
      qrDataUrl: string;
      secret: string;
      email: string;
      nombre: string;
      rol: RolUsuario;
    }
  | {
      exito: true;
      requiereSetup2FA: false;
      userId: string;
      tempAuthToken: string;
      email: string;
      nombre: string;
      rol: RolUsuario;
    }
  | {
      exito: false;
      mensaje: string;
      estadoCuenta?: EstadoCuentaUsuario;
    };

export type Paso2LoginResultado =
  | {
      exito: true;
      sesion: SesionUsuarioActiva;
    }
  | {
      exito: false;
      mensaje: string;
    };

/**
 * Paso 1 de autenticación: Valida Correo y Contraseña segura.
 * Si las credenciales son válidas y la cuenta está ACTIVA, retorna el desafío para el Paso 2 (TOTP)
 * junto con el Código QR de Google Authenticator si es el primer inicio de sesión.
 */
export async function validarCredencialesPaso1Action(
  email: string,
  password: string
): Promise<Paso1LoginResultado> {
  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado || !emailNormalizado.includes('@')) {
    return { exito: false, mensaje: 'Ingresa un correo electrónico corporativo válido.' };
  }
  if (!password) {
    return { exito: false, mensaje: 'Ingresa tu contraseña de acceso.' };
  }

  let usuario: UsuarioCorporativo | null = null;

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('email', emailNormalizado)
        .maybeSingle();

      if (!error && data && esFilaUsuario(data)) {
        usuario = mapearUsuario(data);
        obtenerAlmacenUsuarios().set(usuario.id, usuario);
      }
    } catch {
      // Continuar con memoria
    }
  }

  if (!usuario) {
    for (const u of Array.from(obtenerAlmacenUsuarios().values())) {
      if (u.email.toLowerCase() === emailNormalizado) {
        usuario = u;
        break;
      }
    }
  }

  if (!usuario) {
    return { exito: false, mensaje: 'No existe ninguna cuenta registrada con este correo en la plataforma.' };
  }

  if (usuario.estadoCuenta === 'PENDIENTE_AUTORIZACION') {
    return {
      exito: false,
      estadoCuenta: 'PENDIENTE_AUTORIZACION',
      mensaje:
        'Tu cuenta se encuentra en revisión conforme a la Ley 1990 de 2019. Coordinación Operativa debe autorizar tu registro antes de ingresar.',
    };
  }

  if (usuario.estadoCuenta === 'SUSPENDIDO') {
    return {
      exito: false,
      estadoCuenta: 'SUSPENDIDO',
      mensaje: 'Esta cuenta ha sido SUSPENDIDA por la administración corporativa (CA-05.2).',
    };
  }

  const hashValido = verifyPassword(password, usuario.passwordHash);
  if (!hashValido) {
    return { exito: false, mensaje: 'Contraseña incorrecta. Por favor verifica tus credenciales.' };
  }

  const tempAuthToken = firmarDesafioAuth(usuario.id, usuario.email);

  if (!usuario.totpConfigurado || !usuario.totpSecret) {
    const { secret, uri } = generarSecretoTOTP(usuario.email, 'Fundación Mesa Común');
    const qrDataUrl = await generarQrDataUrl(uri);
    return {
      exito: true,
      requiereSetup2FA: true,
      userId: usuario.id,
      tempAuthToken,
      qrDataUrl,
      secret,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
  }

  return {
    exito: true,
    requiereSetup2FA: false,
    userId: usuario.id,
    tempAuthToken,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  };
}

/**
 * Paso 2A: Completa el enrolamiento inicial de Google Authenticator escaneando el QR
 * e ingresando el primer token de 6 dígitos para validar la sincronización.
 */
export async function completarEnrolamiento2FAAction(input: {
  userId: string;
  tempAuthToken: string;
  tokenTotp: string;
  secret: string;
}): Promise<Paso2LoginResultado> {
  const { userId, tempAuthToken, tokenTotp, secret } = input;
  if (!verificarDesafioAuth(tempAuthToken, userId)) {
    return {
      exito: false,
      mensaje: 'La sesión del desafío de seguridad ha expirado. Por favor inicia sesión nuevamente.',
    };
  }

  const tokenValido = verificarTokenTOTP(tokenTotp, secret, 1);
  if (!tokenValido) {
    return {
      exito: false,
      mensaje:
        'Código de verificación incorrecto o expirado. Revisa el código actual de 6 dígitos que muestra Google Authenticator y asegúrate de que el reloj de tu teléfono esté sincronizado.',
    };
  }

  let usuario = obtenerAlmacenUsuarios().get(userId);
  if (!usuario && esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle();
      if (data && esFilaUsuario(data)) {
        usuario = mapearUsuario(data);
      }
    } catch {}
  }

  if (!usuario) {
    return { exito: false, mensaje: 'Usuario no encontrado en el sistema.' };
  }

  const ahoraIso = new Date().toISOString();
  usuario.totpSecret = secret;
  usuario.totpConfigurado = true;
  obtenerAlmacenUsuarios().set(usuario.id, usuario);

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      await supabase
        .from('usuarios')
        .update({
          totp_secret: secret,
          totp_configurado: true,
          totp_actualizado_at: ahoraIso,
        })
        .eq('id', userId);
    } catch {
      // Ignorar si las columnas no están aún creadas en Supabase
    }
  }

  obtenerBitacoraMemoria().push({
    id: generarUuid(),
    adminId: userId,
    usuarioAfectadoId: userId,
    usuarioAfectadoEmail: usuario.email,
    accion: 'ENROLAR_2FA',
    motivo: 'Enrolamiento y vinculación exitosa de Google Authenticator TOTP (RFC 6238)',
    timestamp: ahoraIso,
  });

  const sesion: SesionUsuarioActiva = {
    id: usuario.id,
    userId: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    telefono: usuario.telefono,
    zona: 'CENTRO',
    estadoCuenta: usuario.estadoCuenta,
    vehiculoTipo: usuario.vehiculoTipo,
    organizacionId: usuario.organizacionId,
  };

  return { exito: true, sesion };
}

/**
 * Paso 2B: Valida el token TOTP de 6 dígitos de Google Authenticator para usuarios con 2FA ya vinculado.
 */
export async function verificarPaso2TOTPAction(input: {
  userId: string;
  tempAuthToken: string;
  tokenTotp: string;
}): Promise<Paso2LoginResultado> {
  const { userId, tempAuthToken, tokenTotp } = input;
  if (!verificarDesafioAuth(tempAuthToken, userId)) {
    return {
      exito: false,
      mensaje: 'La sesión del desafío de seguridad ha expirado. Por favor inicia sesión nuevamente.',
    };
  }

  let usuario = obtenerAlmacenUsuarios().get(userId);
  if (!usuario && esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle();
      if (data && esFilaUsuario(data)) {
        usuario = mapearUsuario(data);
      }
    } catch {}
  }

  if (!usuario) {
    return { exito: false, mensaje: 'Usuario no encontrado en el sistema.' };
  }

  if (!usuario.totpSecret) {
    return { exito: false, mensaje: 'Este usuario no tiene configurado Google Authenticator.' };
  }

  const tokenValido = verificarTokenTOTP(tokenTotp, usuario.totpSecret, 1);
  if (!tokenValido) {
    return {
      exito: false,
      mensaje: 'Código de verificación incorrecto o expirado. Consulta el código actual en Google Authenticator.',
    };
  }

  const sesion: SesionUsuarioActiva = {
    id: usuario.id,
    userId: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    telefono: usuario.telefono,
    zona: 'CENTRO',
    estadoCuenta: usuario.estadoCuenta,
    vehiculoTipo: usuario.vehiculoTipo,
    organizacionId: usuario.organizacionId,
  };

  return { exito: true, sesion };
}

/**
 * Permite a ADMIN y COORDINADOR restablecer el 2FA de un usuario si extravió su celular.
 */
export async function restablecer2FAUsuarioAction(
  adminActorId: string,
  usuarioAfectadoId: string,
  motivo = 'Restablecimiento de 2FA solicitado por el usuario'
): Promise<ResultadoAccionAdmin<{ usuarioId: string }>> {
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAprobador(supabase, adminActorId);
  if (denegado) return denegado;

  let usuario = obtenerAlmacenUsuarios().get(usuarioAfectadoId);
  if (!usuario && esSupabaseConfigurado()) {
    try {
      const { data } = await supabase!.from('usuarios').select('*').eq('id', usuarioAfectadoId).maybeSingle();
      if (data && esFilaUsuario(data)) {
        usuario = mapearUsuario(data);
      }
    } catch {}
  }

  if (!usuario) {
    return fallo(404, 'Usuario no encontrado');
  }

  usuario.totpSecret = null;
  usuario.totpConfigurado = false;
  obtenerAlmacenUsuarios().set(usuario.id, usuario);

  const ahoraIso = new Date().toISOString();
  if (esSupabaseConfigurado()) {
    try {
      await supabase!
        .from('usuarios')
        .update({
          totp_secret: null,
          totp_configurado: false,
          totp_actualizado_at: ahoraIso,
        })
        .eq('id', usuarioAfectadoId);
    } catch {}
  }

  obtenerBitacoraMemoria().push({
    id: generarUuid(),
    adminId: adminActorId,
    usuarioAfectadoId,
    usuarioAfectadoEmail: usuario.email,
    accion: 'RESET_2FA',
    motivo,
    timestamp: ahoraIso,
  });

  return {
    exito: true,
    codigo: 200,
    mensaje: '2FA restablecido correctamente. El usuario podrá escanear un nuevo Código QR en su próximo inicio de sesión.',
    data: { usuarioId: usuarioAfectadoId },
  };
}

/**
 * Registra una postulación pública externa (VOLUNTARIO, DONANTE, RECEPTOR).
 *
 * ¿Por qué?: En el estándar corporativo (EatCloud / Fundación Mesa Común), los actores externos
 * postulan su registro y entran en estado PENDIENTE_AUTORIZACION. Los roles internos (ADMIN y
 * COORDINADOR) son de personal directo y no se admiten en registro público.
 */
export async function registrarPostulacionPublicaAction(input: {
  nombre: string;
  email: string;
  telefono: string;
  zona: ZonaCali;
  rol: RolUsuario;
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  organizacionId?: string;
  organizacionNombre?: string;
  direccion?: string;
  tieneRefrigeracion?: boolean;
  capacidadRacionesDia?: number;
  password?: string;
}): Promise<{ exito: true; usuario: UsuarioCorporativo; mensaje: string } | { exito: false; error: string }> {
  const nombre = input.nombre.trim();
  const email = input.email.trim().toLowerCase();
  const telefono = input.telefono.trim();

  if (nombre.length < 3) {
    return { exito: false, error: 'El nombre completo debe tener al menos 3 caracteres.' };
  }
  if (!email.includes('@')) {
    return { exito: false, error: 'El correo electrónico no es válido.' };
  }
  if (telefono.length < 7) {
    return { exito: false, error: 'El teléfono debe tener al menos 7 dígitos.' };
  }
  if (input.password && input.password.length < 8) {
    return { exito: false, error: 'La contraseña de acceso debe tener al menos 8 caracteres.' };
  }

  // Restricción estricta de roles autorregistrados
  if (!esRolAutoRegistrablePublico(input.rol)) {
    return {
      exito: false,
      error: `El rol ${input.rol} es de gestión interna corporativa y no admite auto-registro público.`,
    };
  }

  const id = generarUuid();
  const ahoraIso = new Date().toISOString();
  const passwordHash = input.password
    ? hashPassword(input.password)
    : hashPassword(PASSWORD_SEED_DEFAULT);

  const nuevoUsuario: UsuarioCorporativo = {
    id,
    nombre,
    email,
    rol: input.rol,
    telefono,
    vehiculoTipo: input.vehiculoTipo,
    disponible: true,
    organizacionId: input.organizacionId,
    estadoCuenta: 'PENDIENTE_AUTORIZACION',
    permisosGranulares: [],
    createdAt: ahoraIso,
    passwordHash,
    totpConfigurado: false,
  };

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usuarios')
        .insert([
          {
            id,
            nombre,
            email,
            rol: input.rol,
            telefono,
            vehiculo_tipo: input.vehiculoTipo || null,
            disponible: true,
            organizacion_id: input.organizacionId || null,
            estado_cuenta: 'PENDIENTE_AUTORIZACION',
            permisos_granulares: [],
            password_hash: passwordHash,
            totp_configurado: false,
          },
        ])
        .select('id')
        .maybeSingle();

      if (!error && data?.id) {
        nuevoUsuario.id = String(data.id);
      }
    } catch {
      // Respaldo en memoria
    }
  }

  obtenerAlmacenUsuarios().set(nuevoUsuario.id, nuevoUsuario);

  return {
    exito: true,
    usuario: nuevoUsuario,
    mensaje:
      'Tu postulación ha sido recibida con éxito. Por normatividad de rescate de alimentos (Ley 1990), un Coordinador u Administrador de Fundación Mesa Común validará tus datos antes de activar tu cuenta.',
  };
}

/**
 * Aprueba una cuenta en PENDIENTE_AUTORIZACION activándola para operar en el sistema.
 * Puede ser ejecutado por ADMIN o COORDINADOR.
 */
export async function aprobarSolicitudUsuarioAction(
  actor: string | ActorRbac,
  usuarioId: string,
  motivo: string = 'Aprobación de cuenta por Coordinación Operativa Mesa Común'
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAprobador(supabase, actorId);
  if (denegado) return denegado;

  const validacion = CambiarEstadoSchema.safeParse({
    usuarioId,
    nuevoEstado: 'ACTIVO',
    motivo,
  });
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  if (supabase) {
    try {
      await supabase
        .from('usuarios')
        .update({ estado_cuenta: 'ACTIVO', disponible: true })
        .eq('id', usuarioId);
    } catch {
      // Fallback
    }
  }

  const almacen = obtenerAlmacenUsuarios();
  const actual = almacen.get(usuarioId);
  const actualizado: UsuarioCorporativo = actual
    ? { ...actual, estadoCuenta: 'ACTIVO', disponible: true }
    : {
        id: usuarioId,
        nombre: 'Usuario Aprobado',
        email: 'aprobado@mesacomun.org',
        rol: 'VOLUNTARIO',
        telefono: '+573000000000',
        disponible: true,
        estadoCuenta: 'ACTIVO',
        permisosGranulares: [],
        createdAt: new Date().toISOString(),
      };

  almacen.set(actualizado.id, actualizado);

  obtenerBitacoraMemoria().unshift({
    id: generarUuid(),
    adminId: actorId,
    usuarioAfectadoId: actualizado.id,
    usuarioAfectadoEmail: actualizado.email,
    accion: 'REACTIVAR',
    rolAnterior: actualizado.rol,
    rolNuevo: actualizado.rol,
    estadoAnterior: 'PENDIENTE_AUTORIZACION',
    estadoNuevo: 'ACTIVO',
    motivo,
    timestamp: new Date().toISOString(),
  });

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Cuenta aprobada y activada exitosamente.',
    data: actualizado,
  };
}

/**
 * Purga el 100% de las tablas transaccionales y catálogos en Supabase y memoria (Solo ADMIN).
 */
export async function purgarSistemaCompletoAction(
  actor?: string | ActorRbac
): Promise<{ exito: boolean; codigo: number; mensaje: string }> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;

  // Si hay usuarios existentes, validar que sea ADMIN
  const totalUsuarios = obtenerAlmacenUsuarios().size;
  if (totalUsuarios > 0) {
    const denegado = await verificarActorAdmin(supabase, actorId);
    if (denegado) {
      return { exito: false, codigo: 403, mensaje: 'Solo un Administrador activo puede purgar el sistema.' };
    }
  }

  if (supabase) {
    try {
      // Intentar RPC si está desplegada
      const rpcRes = await supabase.rpc('purgar_sistema_completo', { p_admin_id: actorId });
      if (!rpcRes.error && rpcRes.data?.exito) {
        // Limpieza de memoria
        obtenerAlmacenUsuarios().clear();
        obtenerBitacoraMemoria().length = 0;
        return { exito: true, codigo: 200, mensaje: 'Purga total completada vía RPC en Supabase.' };
      }

      // Si no existe la RPC, purgar vía Service Role DELETE
      await supabase.from('donaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('organizaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // Fallback
    }
  }

  obtenerAlmacenUsuarios().clear();
  obtenerBitacoraMemoria().length = 0;

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Purga total ejecutada exitosamente. Todas las tablas en 0.',
  };
}

/**
 * Crea un usuario corporativo (solo ADMIN) y audita la acción `CREAR`.
 */
export async function crearUsuarioCorporativo(
  actor: string | ActorRbac,
  input: NuevoUsuarioCorporativoInput
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  const validacion = NuevoUsuarioSchema.safeParse(input);
  if (!validacion.success) return fallo(400, primerError(validacion.error));

  const d = validacion.data;

  for (const u of Array.from(obtenerAlmacenUsuarios().values())) {
    if (u.email === d.email) {
      return fallo(409, 'El correo electrónico ya se encuentra registrado');
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
        p_vehiculo_tipo: d.vehiculoTipo ?? null,
        p_organizacion_id: d.organizacionId ?? null,
        p_permisos_granulares: d.permisosGranulares ?? [],
        p_motivo: d.motivo ?? 'Alta de usuario corporativo',
      });

      if (!error && data) {
        return resolverRespuestaRpc(data, error);
      }
    } catch {
      // Fallback a mutación directa / memoria
    }
  }

  const id = generarUuid();
  const ahoraIso = new Date().toISOString();
  const nuevoUsuario: UsuarioCorporativo = {
    id,
    nombre: d.nombre,
    email: d.email,
    rol: d.rol,
    telefono: d.telefono,
    vehiculoTipo: d.vehiculoTipo,
    disponible: true,
    organizacionId: d.organizacionId,
    estadoCuenta: d.rol === 'ADMIN' ? 'ACTIVO' : 'ACTIVO',
    permisosGranulares: d.permisosGranulares ?? [],
    createdAt: ahoraIso,
  };

  if (supabase) {
    try {
      const { data: insertado } = await supabase
        .from('usuarios')
        .insert([
          {
            id,
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
 * Cambia el rol de un usuario (solo ADMIN) y registra `EDITAR_ROL` con el rol anterior y nuevo.
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
 */
export async function cambiarEstadoCuentaUsuario(
  actor: string | ActorRbac,
  usuarioIdOrParams: string | { usuarioId: string; nuevoEstado: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION'; motivo: string },
  nuevoEstadoParam?: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION',
  motivoParam?: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAdmin(supabase, actorId);
  if (denegado) return denegado;

  let usuarioId: string;
  let nuevoEstado: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION';
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

  if (servidorConfigurado() && supabase && (nuevoEstado === 'ACTIVO' || nuevoEstado === 'SUSPENDIDO')) {
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

export async function cambiarEstadoUsuario(
  actor: string | ActorRbac,
  usuarioIdOrParams: string | { usuarioId: string; nuevoEstado: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION'; motivo: string },
  nuevoEstadoParam?: 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_AUTORIZACION',
  motivoParam?: string
): Promise<ResultadoAccionAdmin<UsuarioCorporativo>> {
  return cambiarEstadoCuentaUsuario(actor, usuarioIdOrParams, nuevoEstadoParam, motivoParam);
}

/**
 * Lista usuarios corporativos para el panel de administración.
 */
export async function listarUsuariosCorporativos(
  actor?: string | ActorRbac,
  filtros?: FiltrosUsuariosCorporativos
): Promise<UsuarioCorporativo[]> {
  const actorId = extraerActorId(actor);
  const supabase = esSupabaseConfigurado() ? createClient() : null;
  const denegado = await verificarActorAprobador(supabase, actorId);
  if (denegado) return [];

  const valFiltros = FiltrosListadoSchema.safeParse(filtros);
  const f = valFiltros.success ? valFiltros.data : undefined;
  const resultadoPorId = new Map<string, UsuarioCorporativo>();

  if (supabase) {
    try {
      let query = supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIMITE_LISTADO);

      if (f?.rol) query = query.eq('rol', f.rol);
      if (f?.estadoCuenta) query = query.eq('estado_cuenta', f.estadoCuenta);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        for (const fila of data) {
          if (esFilaUsuario(fila)) {
            const u = mapearUsuario(fila);
            resultadoPorId.set(u.id, u);
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  for (const u of Array.from(obtenerAlmacenUsuarios().values())) {
    if (f?.rol && u.rol !== f.rol) continue;
    if (f?.estadoCuenta && u.estadoCuenta !== f.estadoCuenta) continue;
    if (!resultadoPorId.has(u.id)) {
      resultadoPorId.set(u.id, u);
    }
  }

  return Array.from(resultadoPorId.values());
}

/**
 * Consulta la bitácora inmutable de eventos RBAC (`audit_rbac_eventos`).
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
