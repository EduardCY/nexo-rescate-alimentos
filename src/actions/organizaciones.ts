'use server';

import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import type {
  EstadoCuentaUsuario,
  Organizacion,
  RolUsuario,
  UsuarioCorporativo,
  ZonaCali,
} from '@/types';
import { inferirZonaCali } from '@/lib/utils/donaciones-helper';

/**
 * Perfil de sesión activa con datos específicos del rol y de su organización vinculada.
 *
 * ¿Por qué?: Permite que cada uno de los 5 portales (DONANTE, VOLUNTARIO, RECEPTOR,
 * COORDINADOR, ADMIN) adapte su navegación e interfaz sin mostrar controles ajenos.
 */
export interface SesionUsuarioActiva {
  id: string;
  userId?: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono: string;
  zona: ZonaCali;
  estadoCuenta: EstadoCuentaUsuario;
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  medioTransporte?: string;
  organizacionId?: string;
  organizacionNombre?: string;
  nit?: string;
  direccion?: string;
  tieneRefrigeracion?: boolean;
  capacidadRacionesDia?: number;
  comensalesDiarios?: number;
}

export interface RegistroPorRolInput {
  rol: RolUsuario;
  nombre: string;
  email: string;
  telefono: string;
  zona: ZonaCali;
  // Campos exclusivos de DONANTE y RECEPTOR
  organizacionNombre?: string;
  nit?: string;
  direccion?: string;
  tieneRefrigeracion?: boolean;
  plazaGaleria?: string;
  plazagalería?: string;
  // Campo exclusivo de RECEPTOR (Comedor)
  capacidadRacionesDia?: number;
  comensalesDiarios?: number;
  urgencia?: 'Alta' | 'Media' | 'Normal' | 'ALTA' | 'MEDIA' | 'BAJA' | string;
  // Campo exclusivo de VOLUNTARIO
  vehiculoTipo?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE';
  medioTransporte?: 'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE' | string;
}

export type OrganizacionRegistrada = Organizacion & {
  nit?: string;
  capacidadFrio?: boolean;
  comensalesDiarios?: number;
};

export interface CrearOrganizacionInput {
  nombre: string;
  tipo: 'DONANTE' | 'RECEPTOR' | 'FUNDACION';
  direccion: string;
  zona: ZonaCali;
  telefono?: string;
  nit?: string;
  tieneRefrigeracion: boolean;
  capacidadRacionesDia?: number;
  comensalesDiarios?: number;
  urgencia?: 'Alta' | 'Media' | 'Normal' | 'ALTA' | 'MEDIA' | 'BAJA' | string;
  capacidadFrio?: boolean;
  coordenadas?: { lat: number; lng: number };
}

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_ORGANIZACIONES_VOLATILES: Map<string, Organizacion & { nit?: string }> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_USUARIOS_PERFILES: Map<string, UsuarioCorporativo & { zona?: ZonaCali; organizacionNombre?: string; direccion?: string; nit?: string; tieneRefrigeracion?: boolean; capacidadRacionesDia?: number }> | undefined;
}

function obtenerMapaOrganizaciones(): Map<string, Organizacion & { nit?: string }> {
  if (!globalThis.__NEXO_ORGANIZACIONES_VOLATILES) {
    globalThis.__NEXO_ORGANIZACIONES_VOLATILES = new Map();
  }
  return globalThis.__NEXO_ORGANIZACIONES_VOLATILES;
}

function obtenerMapaUsuarios(): Map<
  string,
  UsuarioCorporativo & {
    zona?: ZonaCali;
    organizacionNombre?: string;
    direccion?: string;
    nit?: string;
    tieneRefrigeracion?: boolean;
    capacidadRacionesDia?: number;
  }
> {
  if (!globalThis.__NEXO_USUARIOS_PERFILES) {
    globalThis.__NEXO_USUARIOS_PERFILES = new Map();
  }
  return globalThis.__NEXO_USUARIOS_PERFILES;
}

const COORDENADAS_ZONA: Record<ZonaCali, { lat: number; lng: number }> = {
  CENTRO: { lat: 3.435, lng: -76.528 },
  NORTE: { lat: 3.475, lng: -76.515 },
  SUR: { lat: 3.402, lng: -76.538 },
  ORIENTE: { lat: 3.422, lng: -76.492 },
  LADERA: { lat: 3.428, lng: -76.56 },
};

function generarUuidDeterminista(): string {
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
 * Lista todas las organizaciones reales (Comedores Comunitarios y Comercios Donantes).
 *
 * ¿Por qué?: Garantiza que los selectores de comedores, el directorio y el mapa cartográfico
 * consuman únicamente organizaciones reales creadas por los usuarios, sin mocks prefabricados.
 */
export async function listarOrganizaciones(
  tipo?: 'DONANTE' | 'RECEPTOR' | 'FUNDACION' | 'TODAS'
): Promise<Array<Organizacion & { nit?: string }>> {
  const resultadoPorId = new Map<string, Organizacion & { nit?: string }>();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      let query = supabase.from('organizaciones').select('*').order('created_at', { ascending: false });
      if (tipo && tipo !== 'TODAS') {
        query = query.eq('tipo', tipo);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const zona = ((row.zona as ZonaCali) || inferirZonaCali(row.direccion || '')) as ZonaCali;
          const org: Organizacion & { nit?: string } = {
            id: String(row.id),
            nombre: String(row.nombre),
            tipo: (row.tipo as 'DONANTE' | 'RECEPTOR' | 'FUNDACION') || 'RECEPTOR',
            direccion: String(row.direccion || 'Santiago de Cali'),
            zona,
            municipio: 'Santiago de Cali',
            coordenadas:
              row.latitud != null && row.longitud != null
                ? { lat: Number(row.latitud), lng: Number(row.longitud) }
                : COORDENADAS_ZONA[zona],
            telefono: row.telefono ? String(row.telefono) : undefined,
            tieneRefrigeracion: Boolean(row.tiene_refrigeracion),
            capacidadRacionesDia:
              row.capacidad_raciones_dia != null ? Number(row.capacidad_raciones_dia) : undefined,
          };
          resultadoPorId.set(org.id, org);
        }
      }
    } catch {
      // Continúa con almacén en memoria si no hay conexión a Supabase
    }
  }

  for (const org of Array.from(obtenerMapaOrganizaciones().values())) {
    if (!tipo || tipo === 'TODAS' || org.tipo === tipo) {
      if (!resultadoPorId.has(org.id)) {
        resultadoPorId.set(org.id, org);
      }
    }
  }

  return Array.from(resultadoPorId.values());
}

/**
 * Crea un Comedor Comunitario (RECEPTOR) o un Comercio Donante (DONANTE).
 *
 * ¿Por qué?: Permite a Coordinadores, Administradores y actores en registro dar de alta
 * comedores y donantes reales con su capacidad instalada de refrigeración y raciones.
 */
export async function crearOrganizacion(
  input: CrearOrganizacionInput
): Promise<{ exito: true; organizacion: Organizacion & { nit?: string } } | { exito: false; error: string }> {
  const nombre = input.nombre.trim();
  const direccion = input.direccion.trim();
  if (nombre.length < 3) {
    return { exito: false, error: 'El nombre de la organización debe tener al menos 3 caracteres.' };
  }
  if (direccion.length < 5) {
    return { exito: false, error: 'La dirección en Cali debe tener al menos 5 caracteres.' };
  }

  const zona: ZonaCali = input.zona || inferirZonaCali(direccion);
  const coords = input.coordenadas || COORDENADAS_ZONA[zona];
  let idFinal = generarUuidDeterminista();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('organizaciones')
        .insert([
          {
            nombre,
            tipo: input.tipo,
            direccion,
            zona,
            latitud: coords.lat,
            longitud: coords.lng,
            telefono: input.telefono?.trim() || null,
            tiene_refrigeracion: Boolean(input.tieneRefrigeracion),
            capacidad_raciones_dia:
              (input.capacidadRacionesDia || input.comensalesDiarios) &&
              (input.capacidadRacionesDia || input.comensalesDiarios)! > 0
                ? Math.floor((input.capacidadRacionesDia || input.comensalesDiarios)!)
                : null,
          },
        ])
        .select('id')
        .maybeSingle();

      if (!error && data?.id) {
        idFinal = String(data.id);
      }
    } catch {
      // Respaldo en memoria
    }
  }

  const nuevaOrg: Organizacion & { nit?: string } = {
    id: idFinal,
    nombre,
    tipo: input.tipo,
    direccion,
    zona,
    municipio: 'Santiago de Cali',
    coordenadas: coords,
    telefono: input.telefono?.trim() || undefined,
    tieneRefrigeracion: Boolean(input.tieneRefrigeracion),
    capacidadRacionesDia:
      input.capacidadRacionesDia && input.capacidadRacionesDia > 0
        ? Math.floor(input.capacidadRacionesDia)
        : undefined,
    nit: input.nit?.trim() || undefined,
  };

  obtenerMapaOrganizaciones().set(nuevaOrg.id, nuevaOrg);
  return { exito: true, organizacion: nuevaOrg };
}

/**
 * Actualiza los datos operativos de un Comedor Comunitario o Donante.
 *
 * ¿Por qué?: Permite al rol RECEPTOR mantener al día su capacidad de raciones y el estado
 * de sus equipos de refrigeración para evitar el envío de perecederos cuando no hay frío.
 */
export async function actualizarOrganizacion(
  id: string,
  cambios: Partial<CrearOrganizacionInput>
): Promise<{ exito: true; organizacion: Organizacion & { nit?: string } } | { exito: false; error: string }> {
  if (!id) {
    return { exito: false, error: 'Identificador de organización requerido.' };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const payloadDb: Record<string, unknown> = {};
      if (cambios.nombre !== undefined) payloadDb.nombre = cambios.nombre.trim();
      if (cambios.direccion !== undefined) payloadDb.direccion = cambios.direccion.trim();
      if (cambios.zona !== undefined) payloadDb.zona = cambios.zona;
      if (cambios.telefono !== undefined) payloadDb.telefono = cambios.telefono.trim() || null;
      if (cambios.tieneRefrigeracion !== undefined) payloadDb.tiene_refrigeracion = cambios.tieneRefrigeracion;
      if (cambios.capacidadRacionesDia !== undefined) {
        payloadDb.capacidad_raciones_dia = cambios.capacidadRacionesDia;
      }
      await supabase.from('organizaciones').update(payloadDb).eq('id', id);
    } catch {
      // Continúa con actualización en memoria
    }
  }

  const mapa = obtenerMapaOrganizaciones();
  const actual = mapa.get(id) || {
    id,
    nombre: cambios.nombre || 'Organización',
    tipo: cambios.tipo || 'RECEPTOR',
    direccion: cambios.direccion || 'Santiago de Cali',
    zona: cambios.zona || 'CENTRO',
    tieneRefrigeracion: Boolean(cambios.tieneRefrigeracion),
  };

  const actualizada: Organizacion & { nit?: string } = {
    ...actual,
    nombre: cambios.nombre !== undefined ? cambios.nombre.trim() : actual.nombre,
    direccion: cambios.direccion !== undefined ? cambios.direccion.trim() : actual.direccion,
    zona: cambios.zona !== undefined ? cambios.zona : actual.zona,
    telefono: cambios.telefono !== undefined ? cambios.telefono.trim() : actual.telefono,
    tieneRefrigeracion:
      cambios.tieneRefrigeracion !== undefined ? cambios.tieneRefrigeracion : actual.tieneRefrigeracion,
    capacidadRacionesDia:
      cambios.capacidadRacionesDia !== undefined
        ? cambios.capacidadRacionesDia
        : actual.capacidadRacionesDia,
    nit: cambios.nit !== undefined ? cambios.nit.trim() : actual.nit,
  };

  mapa.set(id, actualizada);
  return { exito: true, organizacion: actualizada };
}

/**
 * Registra un nuevo usuario y su organización (si es DONANTE o RECEPTOR) solicitando
 * exactamente los atributos propios de su rol.
 *
 * ¿Por qué?: Garantiza que cada actor quede registrado en `usuarios` y `organizaciones`
 * con trazabilidad real desde la pantalla `/login`.
 */
export async function registrarUsuarioPorRol(
  input: RegistroPorRolInput
): Promise<{ exito: true; sesion: SesionUsuarioActiva } | { exito: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const nombre = input.nombre.trim();
  const telefono = input.telefono.trim();

  if (nombre.length < 3) {
    return { exito: false, error: 'El nombre debe tener al menos 3 caracteres.' };
  }
  if (!email.includes('@')) {
    return { exito: false, error: 'Ingresa un correo electrónico válido.' };
  }
  if (telefono.length < 7) {
    return { exito: false, error: 'El teléfono de contacto debe tener al menos 7 dígitos.' };
  }

  let organizacionId: string | undefined;
  let organizacionNombre: string | undefined;

  if (input.rol === 'DONANTE' || input.rol === 'RECEPTOR') {
    const orgNombre = (input.organizacionNombre || nombre).trim();
    const orgDir = (input.direccion || '').trim();
    if (orgNombre.length < 3) {
      return {
        exito: false,
        error:
          input.rol === 'DONANTE'
            ? 'Ingresa el nombre del comercio o puesto donante.'
            : 'Ingresa el nombre del comedor comunitario o fundación.',
      };
    }
    if (orgDir.length < 5) {
      return { exito: false, error: 'Ingresa la dirección o plaza de ubicación en Cali.' };
    }

    const orgRes = await crearOrganizacion({
      nombre: orgNombre,
      tipo: input.rol === 'DONANTE' ? 'DONANTE' : 'RECEPTOR',
      direccion: orgDir,
      zona: input.zona,
      telefono,
      nit: input.nit,
      tieneRefrigeracion: Boolean(input.tieneRefrigeracion),
      capacidadRacionesDia: input.capacidadRacionesDia,
    });

    if (!orgRes.exito) {
      return orgRes;
    }
    organizacionId = orgRes.organizacion.id;
    organizacionNombre = orgRes.organizacion.nombre;
  }

  let userId = generarUuidDeterminista();
  const ahoraIso = new Date().toISOString();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data: existente } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (existente) {
        if (existente.estado_cuenta === 'SUSPENDIDO') {
          return {
            exito: false,
            error: 'Esta cuenta se encuentra SUSPENDIDA por el Administrador del Sistema.',
          };
        }
        userId = String(existente.id);
      } else {
        const payloadUsuario: Record<string, unknown> = {
          nombre,
          email,
          rol: input.rol,
          telefono,
          organizacion_id: organizacionId || null,
          vehiculo_tipo: input.rol === 'VOLUNTARIO' ? input.vehiculoTipo || 'MOTO' : null,
          disponible: true,
          estado_cuenta: 'ACTIVO',
        };
        const { data: insertado, error: errIns } = await supabase
          .from('usuarios')
          .insert([payloadUsuario])
          .select('id')
          .maybeSingle();

        if (!errIns && insertado?.id) {
          userId = String(insertado.id);
        }
      }
    } catch {
      // Fallback en memoria
    }
  }

  const usuarioCorp = {
    id: userId,
    nombre,
    email,
    rol: input.rol,
    telefono,
    vehiculoTipo: input.rol === 'VOLUNTARIO' ? input.vehiculoTipo || 'MOTO' : undefined,
    disponible: true,
    organizacionId,
    organizacionNombre,
    zona: input.zona,
    direccion: input.direccion?.trim(),
    nit: input.nit?.trim(),
    tieneRefrigeracion: input.tieneRefrigeracion,
    capacidadRacionesDia: input.capacidadRacionesDia,
    estadoCuenta: 'ACTIVO' as EstadoCuentaUsuario,
    permisosGranulares: input.rol === 'ADMIN' ? ['admin:users:read', 'admin:users:write'] : [],
    createdAt: ahoraIso,
  };

  obtenerMapaUsuarios().set(userId, usuarioCorp);

  const sesion: SesionUsuarioActiva = {
    id: userId,
    nombre,
    email,
    rol: input.rol,
    telefono,
    zona: input.zona,
    estadoCuenta: 'ACTIVO',
    vehiculoTipo: usuarioCorp.vehiculoTipo,
    organizacionId,
    organizacionNombre,
    nit: input.nit?.trim(),
    direccion: input.direccion?.trim(),
    tieneRefrigeracion: input.tieneRefrigeracion,
    capacidadRacionesDia: input.capacidadRacionesDia,
  };

  return { exito: true, sesion };
}

/**
 * Inicia sesión con el correo electrónico de un usuario existente validando que su cuenta esté ACTIVA.
 *
 * ¿Por qué?: Verifica el estado RBAC del usuario (`ACTIVO` vs `SUSPENDIDO`) y recupera
 * los datos de su organización para abrir directamente su portal dedicado.
 */
export async function iniciarSesionPorEmail(
  emailInput: string
): Promise<{ exito: true; sesion: SesionUsuarioActiva } | { exito: false; error: string }> {
  const email = emailInput.trim().toLowerCase();
  if (!email.includes('@')) {
    return { exito: false, error: 'Ingresa un correo electrónico válido.' };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data: userRow } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (userRow) {
        const estadoCuenta: EstadoCuentaUsuario =
          (userRow.estado_cuenta as EstadoCuentaUsuario) || 'ACTIVO';
        if (estadoCuenta === 'SUSPENDIDO') {
          return {
            exito: false,
            error:
              'Acceso denegado (403): Tu cuenta ha sido SUSPENDIDA por el Administrador del Sistema.',
          };
        }

        let orgData: Organizacion | undefined;
        if (userRow.organizacion_id) {
          const { data: orgRow } = await supabase
            .from('organizaciones')
            .select('*')
            .eq('id', userRow.organizacion_id)
            .maybeSingle();
          if (orgRow) {
            orgData = {
              id: String(orgRow.id),
              nombre: String(orgRow.nombre),
              tipo: (orgRow.tipo as 'DONANTE' | 'RECEPTOR' | 'FUNDACION') || 'RECEPTOR',
              direccion: String(orgRow.direccion || 'Santiago de Cali'),
              zona: ((orgRow.zona as ZonaCali) || 'CENTRO') as ZonaCali,
              tieneRefrigeracion: Boolean(orgRow.tiene_refrigeracion),
              capacidadRacionesDia:
                orgRow.capacidad_raciones_dia != null
                  ? Number(orgRow.capacidad_raciones_dia)
                  : undefined,
            };
          }
        }

        const sesion: SesionUsuarioActiva = {
          id: String(userRow.id),
          nombre: String(userRow.nombre),
          email: String(userRow.email),
          rol: userRow.rol as RolUsuario,
          telefono: String(userRow.telefono || ''),
          zona: orgData?.zona || 'CENTRO',
          estadoCuenta,
          vehiculoTipo: userRow.vehiculo_tipo || undefined,
          organizacionId: userRow.organizacion_id || undefined,
          organizacionNombre: orgData?.nombre,
          direccion: orgData?.direccion,
          tieneRefrigeracion: orgData?.tieneRefrigeracion,
          capacidadRacionesDia: orgData?.capacidadRacionesDia,
        };

        return { exito: true, sesion };
      }
    } catch {
      // Buscar en memoria si falla red
    }
  }

  for (const u of Array.from(obtenerMapaUsuarios().values())) {
    if (u.email.toLowerCase() === email) {
      if (u.estadoCuenta === 'SUSPENDIDO') {
        return {
          exito: false,
          error:
            'Acceso denegado (403): Tu cuenta ha sido SUSPENDIDA por el Administrador del Sistema.',
        };
      }
      return {
        exito: true,
        sesion: {
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          telefono: u.telefono,
          zona: u.zona || 'CENTRO',
          estadoCuenta: u.estadoCuenta,
          vehiculoTipo: u.vehiculoTipo,
          organizacionId: u.organizacionId,
          organizacionNombre: u.organizacionNombre,
          direccion: u.direccion,
          nit: u.nit,
          tieneRefrigeracion: u.tieneRefrigeracion,
          capacidadRacionesDia: u.capacidadRacionesDia,
        },
      };
    }
  }

  return {
    exito: false,
    error:
      'No encontramos una cuenta con ese correo. Usa la pestaña "Registrarme según mi Rol" para crear tu perfil.',
  };
}

/**
 * Devuelve la lista de usuarios registrados realmente en el sistema para facilitar el cambio de sesión.
 */
export async function listarUsuariosParaAcceso(): Promise<SesionUsuarioActiva[]> {
  const resultado = new Map<string, SesionUsuarioActiva>();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (Array.isArray(data)) {
        for (const row of data) {
          resultado.set(String(row.id), {
            id: String(row.id),
            nombre: String(row.nombre),
            email: String(row.email),
            rol: row.rol as RolUsuario,
            telefono: String(row.telefono || ''),
            zona: 'CENTRO',
            estadoCuenta: (row.estado_cuenta as EstadoCuentaUsuario) || 'ACTIVO',
            vehiculoTipo: row.vehiculo_tipo || undefined,
            organizacionId: row.organizacion_id || undefined,
          });
        }
      }
    } catch {
      // Ignorar fallos de red
    }
  }

  for (const u of Array.from(obtenerMapaUsuarios().values())) {
    if (!resultado.has(u.id)) {
      resultado.set(u.id, {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        telefono: u.telefono,
        zona: u.zona || 'CENTRO',
        estadoCuenta: u.estadoCuenta,
        vehiculoTipo: u.vehiculoTipo,
        organizacionId: u.organizacionId,
        organizacionNombre: u.organizacionNombre,
        direccion: u.direccion,
        nit: u.nit,
        tieneRefrigeracion: u.tieneRefrigeracion,
        capacidadRacionesDia: u.capacidadRacionesDia,
      });
    }
  }

  return Array.from(resultado.values());
}
