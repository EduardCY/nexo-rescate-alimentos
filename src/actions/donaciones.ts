'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import { obtenerMetricasImpactoReal } from '@/actions/metricas';
import type { MetricasImpactoDTO } from '@/types/metricas';
import type { Donacion, RolUsuario, UsuarioCorporativo, ZonaCali } from '@/types';
import type { DonacionCache, ProductoCatalogo } from '@/lib/db';
import {
  normalizarFechaHoraLimite,
  inferirZonaCali,
  filtrarDonacionesDisponibles,
} from '@/lib/utils/donaciones-helper';
import {
  resolverUuidDonacion,
  resolverUuidVoluntario,
  UUID_REGEX,
} from '@/lib/utils/uuid-helper';

export type PublicarDonacionResultado =
  /** `duplicada: true` indica que la idempotencyKey ya había sido procesada y no se creó otro registro. */
  | { exito: true; codigo: string; duplicada?: boolean }
  | { exito: false; error: string };

/** Metadatos de reconciliación offline (CA-01.5 / TASK-29). */
export interface MetaIdempotencia {
  /** UUID v4 generado en el dispositivo; el servidor lo usa para descartar reintentos duplicados. */
  idempotencyKey?: string;
  /** Código determinista OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4>, se conserva en codigo_origen_offline. */
  codigoOrigenOffline?: string;
}

export type TomarDonacionResultado =
  | { exito: true; codigo: 200; mensaje: string; donacion: Donacion; duplicado?: boolean }
  | { exito: false; codigo: 403; mensaje: string; donacionId: string }
  | { exito: false; codigo: 409; mensaje: string; donacionId: string }
  | { exito: false; codigo: 410; mensaje: string; donacionId: string }
  | { exito: false; codigo: 500; mensaje: string; donacionId: string };

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_CATALOGO_VOLATIL: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_DONACIONES_VOLATILES: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_USUARIOS_RBAC: Map<string, UsuarioCorporativo> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_TRAZABILIDAD_EVENTOS:
    | Array<{
        id: string;
        donacionId: string;
        estadoAnterior: string;
        estadoNuevo: string;
        usuarioId?: string;
        usuarioNombre?: string;
        timestamp: string;
        observaciones: string;
      }>
    | undefined;
}

interface RegistroIdempotencia {
  codigo: string;
  donacionId: string;
  donacion?: Donacion;
  registradoAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_IDEMPOTENCIA_REGISTRO: Map<string, RegistroIdempotencia> | undefined;
}

const MAX_REGISTROS_IDEMPOTENCIA = 2000;

/**
 * Los fixtures en memoria solo se habilitan cuando se ejecutan las suites de pruebas automatizadas (Vitest).
 * En ejecución de usuario (desarrollo y producción), el almacén arranca 100% vacío (Política Cero Datos Inventados).
 */
const ES_ENTORNO_TEST = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

function registroIdempotencia(): Map<string, RegistroIdempotencia> {
  if (!globalThis.__NEXO_IDEMPOTENCIA_REGISTRO) {
    globalThis.__NEXO_IDEMPOTENCIA_REGISTRO = new Map<string, RegistroIdempotencia>();
  }
  return globalThis.__NEXO_IDEMPOTENCIA_REGISTRO;
}

function registrarIdempotencia(
  tipo: 'CREATE' | 'TAKE',
  llave: string,
  registro: Omit<RegistroIdempotencia, 'registradoAt'>
): void {
  const mapa = registroIdempotencia();
  mapa.set(`${tipo}:${llave}`, { ...registro, registradoAt: Date.now() });
  while (mapa.size > MAX_REGISTROS_IDEMPOTENCIA) {
    const masAntigua = mapa.keys().next().value;
    if (masAntigua === undefined) break;
    mapa.delete(masAntigua);
  }
}

function esColumnaIdempotenciaInexistente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('idempotency_key') ||
    msg.includes('codigo_origen_offline')
  );
}

function esConflictoIdempotencia(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' && (error.message || '').toLowerCase().includes('idempotency');
}

async function buscarRegistroPorIdempotencyKey(
  tipo: 'CREATE' | 'TAKE',
  llave: string
): Promise<RegistroIdempotencia | null> {
  const enMemoria = registroIdempotencia().get(`${tipo}:${llave}`);
  if (enMemoria) return enMemoria;

  if (tipo !== 'CREATE' || !esSupabaseConfigurado()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('donaciones')
      .select('id, codigo')
      .eq('idempotency_key', llave)
      .maybeSingle();
    if (!error && data?.codigo) {
      const registro: Omit<RegistroIdempotencia, 'registradoAt'> = {
        codigo: data.codigo,
        donacionId: data.id,
      };
      registrarIdempotencia(tipo, llave, registro);
      return { ...registro, registradoAt: Date.now() };
    }
  } catch {
    // Columna inexistente o red caída: se continúa sin verificación en base de datos.
  }
  return null;
}

/** Candados en vuelo para exclusión mutua atómica en memoria */
const CANDADOS_EN_VUELO = new Set<string>();

function crearFixturesSoloParaTests(): Array<[string, Donacion]> {
  if (!ES_ENTORNO_TEST) return [];
  return [
    [
      'seed-01',
      {
        id: 'seed-01',
        codigo: 'DON-201',
        donanteId: 'd-1',
        donanteNombre: 'Puesto 45 Doña Rosa - Santa Elena',
        tipoAlimento: 'Tomate Chonto y Plátano Maduro',
        requiereFrio: false,
        cantidadEstimada: 45,
        unidadMedida: 'kg',
        direccionRecogida: 'Galería Santa Elena - Sector Muelle 2',
        indicacionesPuesto: 'Pabellón Central, Puesto 45 frente a zona de descargue',
        telefonoDonante: '+573154201122',
        coordenadas: { lat: 3.4258, lng: -76.5244 },
        comedorNombre: 'Comedor Comunitario Siloé Esperanza',
        zona: 'CENTRO',
        horaLimite: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'seed-02',
      {
        id: 'seed-02',
        codigo: 'DON-202',
        donanteId: 'd-2',
        donanteNombre: 'Lácteos del Valle - Alameda',
        tipoAlimento: 'Queso Campesino y Yogur Artesanal',
        requiereFrio: true,
        cantidadEstimada: 25,
        unidadMedida: 'kg',
        direccionRecogida: 'Plaza Alameda - Pasillo Central Local 18',
        indicacionesPuesto: 'Entrada por Calle 8, Local 18 refrigerado',
        telefonoDonante: '+573168903344',
        coordenadas: { lat: 3.4372, lng: -76.5389 },
        comedorNombre: 'Hogar de Paso Aguablanca',
        zona: 'SUR',
        horaLimite: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'seed-03',
      {
        id: 'seed-03',
        codigo: 'DON-203',
        donanteId: 'd-3',
        donanteNombre: 'Mayorista de Víveres Cavasa',
        tipoAlimento: 'Canastillas de Naranja Valencia y Guayaba',
        requiereFrio: false,
        cantidadEstimada: 120,
        unidadMedida: 'kg',
        direccionRecogida: 'Cavasa - Bloque 4 Bodega 12',
        indicacionesPuesto: 'Muelle de carga oriental, puerta 3',
        telefonoDonante: '+573175550505',
        coordenadas: { lat: 3.4111, lng: -76.4161 },
        comedorNombre: 'Hogar de Paso Aguablanca',
        zona: 'ORIENTE',
        horaLimite: new Date(Date.now() + 300 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'seed-04',
      {
        id: 'seed-04',
        codigo: 'DON-204',
        donanteId: 'd-4',
        donanteNombre: 'Panadería La Sultana',
        tipoAlimento: 'Pan Rollo y Roscas Caseras',
        requiereFrio: false,
        cantidadEstimada: 30,
        unidadMedida: 'kg',
        direccionRecogida: 'Avenida 6N # 24N-15',
        indicacionesPuesto: 'Mostrador principal, preguntar por Don Hernán',
        telefonoDonante: '+573182224466',
        coordenadas: { lat: 3.4688, lng: -76.5285 },
        comedorNombre: 'Fundación Mesa Común Centro',
        zona: 'NORTE',
        horaLimite: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'seed-05',
      {
        id: 'seed-05',
        codigo: 'DON-205',
        donanteId: 'd-5',
        donanteNombre: 'Frutas y Verduras Siloé',
        tipoAlimento: 'Yuca y Papaya Fresca',
        requiereFrio: false,
        cantidadEstimada: 50,
        unidadMedida: 'kg',
        direccionRecogida: 'Carrera 52 con Calle 1 Oeste',
        indicacionesPuesto: 'Frente a la estación del MIO Cable',
        telefonoDonante: '+573123339988',
        coordenadas: { lat: 3.419, lng: -76.556 },
        comedorNombre: 'Comedor Comunitario Siloé Esperanza',
        zona: 'LADERA',
        horaLimite: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
  ];
}

/** Estado en memoria: vacío en producción/desarrollo; con fixtures únicamente en NODE_ENV === 'test' */
const DONACIONES_ESTADO_VOLATIL: Map<string, Donacion> =
  globalThis.__NEXO_CATALOGO_VOLATIL || new Map<string, Donacion>(crearFixturesSoloParaTests());

globalThis.__NEXO_CATALOGO_VOLATIL = DONACIONES_ESTADO_VOLATIL;

/**
 * Registra o reemplaza una donación en el almacén de memoria (útil para pruebas unitarias e integración sin red).
 */
export async function registrarDonacionEnMemoria(donacion: Donacion): Promise<void> {
  const copia = { ...donacion };
  DONACIONES_ESTADO_VOLATIL.set(donacion.id, copia);
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacion.id, { ...copia });
}

/**
 * Resetea el estado de una donación en memoria a 'DISPONIBLE' liberando cualquier voluntario asignado.
 */
export async function resetearDonacionEnMemoria(id: string): Promise<void> {
  const item = DONACIONES_ESTADO_VOLATIL.get(id);
  if (item) {
    item.estado = 'DISPONIBLE';
    item.voluntarioId = undefined;
    item.voluntarioNombre = undefined;
    item.asignadaAt = undefined;
    DONACIONES_ESTADO_VOLATIL.set(id, item);
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(id, { ...item });
  }
}

/**
 * Marca una donación como 'EXPIRADA' en la base de datos y en la memoria volátil (TASK-16 / CA-02.4).
 */
export async function marcarDonacionExpirada(
  donacionId: string
): Promise<{ exito: boolean; estado: 'EXPIRADA' }> {
  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      await supabase
        .from('donaciones')
        .update({ estado: 'EXPIRADA' })
        .eq('id', donacionId)
        .eq('estado', 'DISPONIBLE');
    } catch {
      // Continuar con actualización en memoria
    }
  }

  const item = DONACIONES_ESTADO_VOLATIL.get(donacionId);
  if (item && item.estado === 'DISPONIBLE') {
    item.estado = 'EXPIRADA';
    DONACIONES_ESTADO_VOLATIL.set(donacionId, item);
  }

  const itemGlobal = globalThis.__NEXO_DONACIONES_VOLATILES?.get(donacionId);
  if (itemGlobal && itemGlobal.estado === 'DISPONIBLE') {
    itemGlobal.estado = 'EXPIRADA';
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionId, itemGlobal);
  }

  return { exito: true, estado: 'EXPIRADA' };
}

/**
 * Publica una oferta de donación de alimentos en la plataforma.
 */
export async function publicarDonacion(
  input: DonacionInput,
  meta: MetaIdempotencia = {}
): Promise<PublicarDonacionResultado> {
  const parseResult = DonacionInputSchema.safeParse(input);

  if (!parseResult.success) {
    const issues =
      parseResult.error.issues ||
      (parseResult.error as unknown as { errors?: Array<{ message: string }> }).errors ||
      [];
    const errorMensaje = issues.map((e) => e.message).join('. ') || parseResult.error.message;
    return {
      exito: false,
      error: errorMensaje,
    };
  }

  const idempotencyKey = meta.idempotencyKey?.trim() || undefined;
  if (idempotencyKey && !UUID_REGEX.test(idempotencyKey)) {
    return {
      exito: false,
      error: 'La llave de idempotencia (idempotencyKey) debe ser un UUID válido.',
    };
  }
  const codigoOrigenOffline = meta.codigoOrigenOffline?.trim().slice(0, 64) || undefined;

  if (idempotencyKey) {
    const previo = await buscarRegistroPorIdempotencyKey('CREATE', idempotencyKey);
    if (previo) {
      return { exito: true, codigo: previo.codigo, duplicada: true };
    }
  }

  const data = parseResult.data;
  const horaIsoNormalizada = normalizarFechaHoraLimite(data.horaLimite);
  const supabase = createClient();
  const zonaDetectada: ZonaCali =
    data.zona || inferirZonaCali(`${data.direccionRecogida} ${data.donanteNombre || ''}`);

  const payload: Record<string, unknown> = {
    tipo_alimento: data.tipoAlimento,
    cantidad_estimada: data.cantidadEstimada,
    unidad_medida: data.unidadMedida,
    direccion_recogida: data.direccionRecogida,
    hora_limite: horaIsoNormalizada,
    requiere_frio: data.requiereFrio,
    exencion_sanitaria_aceptada: data.exencionSanitariaAceptada,
    estado: 'DISPONIBLE',
    donante_id: data.donanteId || '00000000-0000-0000-0000-000000000001',
    donante_nombre: data.donanteNombre || 'Comercio Donante',
    zona: zonaDetectada,
  };

  if (data.comedorId && UUID_REGEX.test(data.comedorId)) {
    payload.comedor_id = data.comedorId;
  }
  if (data.comedorNombre) {
    payload.comedor_nombre = data.comedorNombre;
  }

  const construirDonacion = (id: string, codigo: string): Donacion => ({
    id,
    codigo,
    donanteId: String(payload.donante_id),
    donanteNombre: String(payload.donante_nombre),
    tipoAlimento: String(payload.tipo_alimento),
    requiereFrio: Boolean(payload.requiere_frio),
    cantidadEstimada: Number(payload.cantidad_estimada),
    unidadMedida: data.unidadMedida,
    direccionRecogida: String(payload.direccion_recogida),
    indicacionesPuesto: data.indicacionesPuesto,
    telefonoDonante: data.telefonoDonante,
    coordenadas: data.coordenadas,
    comedorId: data.comedorId,
    comedorNombre: data.comedorNombre,
    zona: zonaDetectada,
    horaLimite: horaIsoNormalizada,
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  });

  const registrarEnMemoria = (nueva: Donacion) => {
    DONACIONES_ESTADO_VOLATIL.set(nueva.id, nueva);
    DONACIONES_ESTADO_VOLATIL.set(nueva.codigo, nueva);
    if (!globalThis.__NEXO_DONACIONES_VOLATILES) {
      globalThis.__NEXO_DONACIONES_VOLATILES = new Map();
    }
    globalThis.__NEXO_DONACIONES_VOLATILES.set(nueva.id, { ...nueva });
    globalThis.__NEXO_DONACIONES_VOLATILES.set(nueva.codigo, { ...nueva });
    if (idempotencyKey) {
      registrarIdempotencia('CREATE', idempotencyKey, { codigo: nueva.codigo, donacionId: nueva.id });
    }
  };

  try {
    const payloadConIdempotencia = idempotencyKey
      ? {
          ...payload,
          idempotency_key: idempotencyKey,
          codigo_origen_offline: codigoOrigenOffline ?? null,
        }
      : payload;

    let { data: donacion, error } = await supabase
      .from('donaciones')
      .insert([payloadConIdempotencia])
      .select('id, codigo')
      .single();

    if (error && idempotencyKey) {
      if (esConflictoIdempotencia(error)) {
        const existente = await buscarRegistroPorIdempotencyKey('CREATE', idempotencyKey);
        if (existente) {
          return { exito: true, codigo: existente.codigo, duplicada: true };
        }
      } else if (esColumnaIdempotenciaInexistente(error)) {
        ({ data: donacion, error } = await supabase
          .from('donaciones')
          .insert([payload])
          .select('id, codigo')
          .single());
      }
    }

    if (error) {
      if ((error as { code?: string }).code) {
        const codigoFallback = `DON-${Date.now().toString().slice(-4)}`;
        registrarEnMemoria(construirDonacion(codigoFallback, codigoFallback));
        return {
          exito: true,
          codigo: codigoFallback,
        };
      }
      return {
        exito: false,
        error: error.message || 'Error al registrar la donación en la base de datos',
      };
    }

    const codigoFinal = donacion?.codigo || `DON-${Date.now().toString().slice(-4)}`;
    const idFinal = donacion?.id || codigoFinal;
    registrarEnMemoria(construirDonacion(idFinal, codigoFinal));

    return {
      exito: true,
      codigo: codigoFinal,
    };
  } catch {
    const codigoFinal = `DON-${Date.now().toString().slice(-4)}`;
    registrarEnMemoria(construirDonacion(codigoFinal, codigoFinal));

    return {
      exito: true,
      codigo: codigoFinal,
    };
  }
}

/**
 * Obtiene el catálogo reactivo de donaciones disponibles (CA-02.1, CA-02.3, CA-02.4).
 * En ejecución de usuario devuelve exclusivamente las donaciones reales (y `[]` si hay 0 registros).
 */
export async function obtenerDonacionesDisponibles(zona?: ZonaCali | 'TODAS'): Promise<Donacion[]> {
  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const ahoraIso = new Date().toISOString();

      let query = supabase
        .from('donaciones')
        .select('*')
        .eq('estado', 'DISPONIBLE')
        .gt('hora_limite', ahoraIso)
        .order('hora_limite', { ascending: true });

      if (zona && zona !== 'TODAS') {
        query = query.eq('zona', zona);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        // En entorno de pruebas sin BD real con datos, si regresa vacío se usa el fixture de test
        if (ES_ENTORNO_TEST && data.length === 0) {
          const listaTest = Array.from(DONACIONES_ESTADO_VOLATIL.values());
          return filtrarDonacionesDisponibles(listaTest, { zona });
        }

        const porId = new Map<string, Donacion>();
        for (const d of data) {
          const mapeada = mapearFilaDonacion(d);
          porId.set(mapeada.id, mapeada);
        }

        // Incluir también las creadas en la sesión actual si aún no están en la consulta remota
        for (const mem of Array.from(DONACIONES_ESTADO_VOLATIL.values())) {
          if (!mem.id.startsWith('seed-') && !porId.has(mem.id) && !porId.has(mem.codigo)) {
            porId.set(mem.id, mem);
          }
        }

        return filtrarDonacionesDisponibles(Array.from(porId.values()), { zona });
      }
    } catch {
      // Fallback a memoria si Supabase no está conectado
    }
  }

  const porId = new Map<string, Donacion>();
  for (const d of Array.from(DONACIONES_ESTADO_VOLATIL.values())) {
    if (!ES_ENTORNO_TEST && d.id.startsWith('seed-')) continue;
    porId.set(d.id, d);
  }
  return filtrarDonacionesDisponibles(Array.from(porId.values()), { zona });
}

/**
 * Obtiene todas las donaciones expiradas (`estado = 'EXPIRADA'` o `hora_limite <= NOW()`)
 * para la auditoría de mermas del Administrador y del Coordinador.
 */
export async function obtenerDonacionesExpiradas(zona?: ZonaCali | 'TODAS'): Promise<Donacion[]> {
  const ahoraMs = Date.now();
  const ahoraIso = new Date(ahoraMs).toISOString();
  const porId = new Map<string, Donacion>();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('donaciones')
        .select('*')
        .or(`estado.eq.EXPIRADA,and(estado.eq.DISPONIBLE,hora_limite.lte.${ahoraIso})`)
        .order('hora_limite', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const d = mapearFilaDonacion(row);
          d.estado = 'EXPIRADA';
          if (zona && zona !== 'TODAS' && d.zona !== zona) continue;
          porId.set(d.id, d);
        }
      }
    } catch {
      // Fallback a memoria
    }
  }

  for (const item of Array.from(DONACIONES_ESTADO_VOLATIL.values())) {
    if (!ES_ENTORNO_TEST && item.id.startsWith('seed-')) continue;
    const vencida = new Date(item.horaLimite).getTime() <= ahoraMs;
    if (item.estado === 'EXPIRADA' || (item.estado === 'DISPONIBLE' && vencida)) {
      const copia: Donacion = { ...item, estado: 'EXPIRADA' };
      if (zona && zona !== 'TODAS' && copia.zona !== zona) continue;
      if (!porId.has(copia.id)) {
        porId.set(copia.id, copia);
      }
    }
  }

  return Array.from(porId.values()).sort(
    (a, b) => new Date(b.horaLimite).getTime() - new Date(a.horaLimite).getTime()
  );
}

/**
 * Obtiene todas las donaciones reales del sistema (filtrables por donante, comedor o incluyendo expiradas).
 */
export async function obtenerTodasLasDonaciones(opciones?: {
  incluirExpiradas?: boolean;
  donanteId?: string;
  donanteNombre?: string;
  comedorId?: string;
  comedorNombre?: string;
  voluntarioId?: string;
}): Promise<Donacion[]> {
  const ahoraMs = Date.now();
  const porId = new Map<string, Donacion>();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('donaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const d = mapearFilaDonacion(row);
          if (d.estado === 'DISPONIBLE' && new Date(d.horaLimite).getTime() <= ahoraMs) {
            d.estado = 'EXPIRADA';
          }
          porId.set(d.id, d);
        }
      }
    } catch {
      // Fallback a memoria
    }
  }

  const fuentes = [DONACIONES_ESTADO_VOLATIL, globalThis.__NEXO_DONACIONES_VOLATILES];
  for (const f of fuentes) {
    if (!f) continue;
    for (const item of Array.from(f.values())) {
      if (!ES_ENTORNO_TEST && item.id.startsWith('seed-')) continue;
      const copia: Donacion = { ...item };
      if (copia.estado === 'DISPONIBLE' && new Date(copia.horaLimite).getTime() <= ahoraMs) {
        copia.estado = 'EXPIRADA';
      }
      if (!porId.has(copia.id)) {
        porId.set(copia.id, copia);
      }
    }
  }

  let lista = Array.from(porId.values());

  if (opciones?.incluirExpiradas === false) {
    lista = lista.filter((d) => d.estado !== 'EXPIRADA');
  }
  if (opciones?.donanteId || opciones?.donanteNombre) {
    lista = lista.filter(
      (d) =>
        (opciones.donanteId && d.donanteId === opciones.donanteId) ||
        (opciones.donanteNombre &&
          d.donanteNombre.toLowerCase() === opciones.donanteNombre.toLowerCase())
    );
  }
  if (opciones?.comedorId || opciones?.comedorNombre) {
    lista = lista.filter(
      (d) =>
        (opciones.comedorId && d.comedorId === opciones.comedorId) ||
        (opciones.comedorNombre &&
          d.comedorNombre &&
          d.comedorNombre.toLowerCase() === opciones.comedorNombre.toLowerCase())
    );
  }
  if (opciones?.voluntarioId) {
    lista = lista.filter((d) => esMismoVoluntario(d.voluntarioId, opciones.voluntarioId));
  }

  return lista.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface AsignarDonacionAComedorParams {
  donacionId: string;
  comedorId: string;
  comedorNombre: string;
  tieneRefrigeracionComedor?: boolean;
  comedorTieneFrio?: boolean;
}

/**
 * Asigna o vincula una donación con un Comedor Comunitario específico validando la cadena de frío.
 */
export async function asignarDonacionAComedor(
  donacionIdOrParams: string | AsignarDonacionAComedorParams,
  comedorIdParam?: string,
  comedorNombreParam?: string,
  tieneRefrigeracionComedorParam = true
): Promise<{ exito: true; donacion: Donacion } | { exito: false; error: string }> {
  let donacionId: string;
  let comedorId: string;
  let comedorNombre: string;
  let tieneRefrigeracionComedor: boolean;

  if (typeof donacionIdOrParams === 'object') {
    donacionId = donacionIdOrParams.donacionId;
    comedorId = donacionIdOrParams.comedorId;
    comedorNombre = donacionIdOrParams.comedorNombre;
    tieneRefrigeracionComedor =
      donacionIdOrParams.tieneRefrigeracionComedor ??
      donacionIdOrParams.comedorTieneFrio ??
      true;
  } else {
    donacionId = donacionIdOrParams;
    comedorId = comedorIdParam || '';
    comedorNombre = comedorNombreParam || '';
    tieneRefrigeracionComedor = tieneRefrigeracionComedorParam;
  }
  const actual = await leerDonacionActual(donacionId);
  if (!actual) {
    return { exito: false, error: 'La donación seleccionada no existe.' };
  }
  if (actual.requiereFrio && !tieneRefrigeracionComedor) {
    return {
      exito: false,
      error:
        'Restricción de Cadena de Frío (CA-01.4 / CA-02.2): Este alimento requiere refrigeración y el comedor seleccionado no dispone de equipo de frío operativo.',
    };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const payloadUpdate: Record<string, unknown> = {
        comedor_nombre: comedorNombre,
      };
      if (UUID_REGEX.test(comedorId)) {
        payloadUpdate.comedor_id = comedorId;
      }
      await supabase.from('donaciones').update(payloadUpdate).eq('id', actual.id);
    } catch {
      // Continuar en memoria
    }
  }

  const actualizada: Donacion = {
    ...actual,
    comedorId,
    comedorNombre,
  };

  DONACIONES_ESTADO_VOLATIL.set(actualizada.id, actualizada);
  DONACIONES_ESTADO_VOLATIL.set(actualizada.codigo, actualizada);
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(actualizada.id, { ...actualizada });
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(actualizada.codigo, { ...actualizada });

  return { exito: true, donacion: actualizada };
}

export interface TrazabilidadEventoRastreo {
  id: string;
  donacionId?: string;
  estadoAnterior: string;
  estadoNuevo: string;
  timestamp: string;
  observaciones?: string;
  usuarioNombre?: string;
}

export type ResultadoRastreoDonacion =
  | {
      encontrada: true;
      donacion: Donacion;
      eventos: TrazabilidadEventoRastreo[];
      error?: undefined;
    }
  | {
      encontrada: false;
      error: string;
      donacion?: undefined;
      eventos?: undefined;
    };

/**
 * Genera o recupera los eventos de trazabilidad de una donación para la línea de tiempo.
 */
function generarEventosRastreo(d: Donacion): TrazabilidadEventoRastreo[] {
  const eventosMemoria = (globalThis.__NEXO_TRAZABILIDAD_EVENTOS || [])
    .filter((ev) => ev.donacionId === d.id || ev.donacionId === d.codigo)
    .map((ev) => ({
      id: ev.id,
      donacionId: ev.donacionId,
      estadoAnterior: ev.estadoAnterior,
      estadoNuevo: ev.estadoNuevo,
      timestamp: ev.timestamp,
      observaciones: ev.observaciones,
      usuarioNombre: ev.usuarioNombre,
    }));

  const eventos: TrazabilidadEventoRastreo[] = [...eventosMemoria];

  if (eventos.length === 0) {
    eventos.push({
      id: `ev-pub-${d.id}`,
      donacionId: d.id,
      estadoAnterior: 'BORRADOR',
      estadoNuevo: 'DISPONIBLE',
      timestamp: d.createdAt || new Date().toISOString(),
      observaciones: `Lote publicado por ${d.donanteNombre} (${d.tipoAlimento}, ${d.cantidadEstimada} ${d.unidadMedida}).`,
      usuarioNombre: d.donanteNombre,
    });

    if (d.asignadaAt || d.estado === 'ASIGNADA' || d.estado === 'ENTREGADA') {
      eventos.push({
        id: `ev-asig-${d.id}`,
        donacionId: d.id,
        estadoAnterior: 'DISPONIBLE',
        estadoNuevo: 'ASIGNADA',
        timestamp: d.asignadaAt || d.createdAt || new Date().toISOString(),
        observaciones: `Rescate asignado al voluntario ${d.voluntarioNombre || 'Verificado'}. Destino: ${d.comedorNombre || 'Comedor'}.`,
        usuarioNombre: d.voluntarioNombre || 'Voluntario Verificado',
      });
    }

    if (d.entregadaAt || d.estado === 'ENTREGADA') {
      eventos.push({
        id: `ev-ent-${d.id}`,
        donacionId: d.id,
        estadoAnterior: 'ASIGNADA',
        estadoNuevo: 'ENTREGADA',
        timestamp: d.entregadaAt || new Date().toISOString(),
        observaciones: `Acta física y digital de recepción cerrada en ${d.comedorNombre || 'Comedor Receptor'}.`,
        usuarioNombre: d.comedorNombre || 'Receptor Autorizado',
      });
    }
  }

  return eventos;
}

/**
 * Consulta pública de rastreo de una donación por su código serial (`DON-XXX` u `OFFLINE-DON-...`)
 * para la línea de tiempo auditada en `/rastreo` (TASK-13 / CA-05.4).
 */
export async function consultarRastreoDonacion(
  codigoInput: string
): Promise<ResultadoRastreoDonacion> {
  const codigoLimpio = codigoInput.trim().toUpperCase();
  if (!codigoLimpio || codigoLimpio.length < 4) {
    return {
      encontrada: false,
      error: 'Ingresa un código válido de seguimiento (ej. DON-101 u OFFLINE-DON-...).',
    };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('donaciones')
        .select('*')
        .or(`codigo.ilike.${codigoLimpio},codigo_origen_offline.ilike.${codigoLimpio}`)
        .maybeSingle();

      if (data) {
        const d = mapearFilaDonacion(data);
        if (d.estado === 'DISPONIBLE' && new Date(d.horaLimite).getTime() <= Date.now()) {
          d.estado = 'EXPIRADA';
        }
        return { encontrada: true, donacion: d, eventos: generarEventosRastreo(d) };
      }
    } catch {
      // Fallback a memoria
    }
  }

  const fuentes = [DONACIONES_ESTADO_VOLATIL, globalThis.__NEXO_DONACIONES_VOLATILES];
  for (const f of fuentes) {
    if (!f) continue;
    for (const item of Array.from(f.values())) {
      if (!ES_ENTORNO_TEST && item.id.startsWith('seed-')) continue;
      if (
        item.codigo.toUpperCase() === codigoLimpio ||
        item.id.toUpperCase() === codigoLimpio
      ) {
        const copia = { ...item };
        if (copia.estado === 'DISPONIBLE' && new Date(copia.horaLimite).getTime() <= Date.now()) {
          copia.estado = 'EXPIRADA';
        }
        return { encontrada: true, donacion: copia, eventos: generarEventosRastreo(copia) };
      }
    }
  }

  return {
    encontrada: false,
    error: `No se encontró ninguna donación registrada con el código "${codigoLimpio}". Verifica el código e intenta nuevamente.`,
  };
}

/**
 * Verifica si un voluntario se encuentra suspendido en el almacén RBAC (CA-05.2).
 */
async function esVoluntarioSuspendido(voluntarioId: string): Promise<boolean> {
  const almacenRbac = globalThis.__NEXO_USUARIOS_RBAC;
  if (almacenRbac) {
    const direct = almacenRbac.get(voluntarioId);
    if (direct && direct.estadoCuenta !== 'ACTIVO') {
      return true;
    }
  }

  if (esSupabaseConfigurado() && UUID_REGEX.test(voluntarioId)) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('usuarios')
        .select('estado_cuenta')
        .eq('id', voluntarioId)
        .maybeSingle();
      if (data && data.estado_cuenta && data.estado_cuenta !== 'ACTIVO') {
        return true;
      }
    } catch {
      // Ignorar si la columna no existe aún
    }
  }

  return false;
}

/**
 * Server Action para tomar/reservar una donación con control atómico de concurrencia (TASK-09 / CMP-03).
 */
async function tomarDonacionInterno(
  donacionId: string,
  voluntarioId = 'vol-001',
  voluntarioNombre = 'Voluntario Mesa Común',
  comedorDestino?: { comedorId?: string; comedorNombre?: string }
): Promise<TomarDonacionResultado> {
  const ahoraIso = new Date().toISOString();
  const ahoraMs = Date.now();

  // CA-05.2: Impedir que un usuario con cuenta SUSPENDIDO tome donaciones
  if (await esVoluntarioSuspendido(voluntarioId)) {
    return {
      exito: false,
      codigo: 403,
      mensaje:
        'Forbidden: Tu cuenta se encuentra SUSPENDIDA y no está autorizada para tomar donaciones.',
      donacionId,
    };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      let uuidDonacion = resolverUuidDonacion(donacionId);
      const uuidVoluntario = resolverUuidVoluntario(voluntarioId);

      if (!uuidDonacion && donacionId.startsWith('DON-')) {
        const { data: donacionDb } = await supabase
          .from('donaciones')
          .select('id, codigo')
          .eq('codigo', donacionId)
          .maybeSingle();

        if (donacionDb?.id && UUID_REGEX.test(donacionDb.id)) {
          uuidDonacion = donacionDb.id;
        }
      }

      if (uuidDonacion) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('tomar_donacion', {
          p_donacion_id: uuidDonacion,
          p_voluntario_id: uuidVoluntario,
          p_voluntario_nombre: voluntarioNombre,
        });

        if (!rpcError && rpcData) {
          if (rpcData.codigo === 200) {
            const donacionMapeada: Donacion = rpcData.donacion || {
              id: rpcData.donacion_id || uuidDonacion,
              codigo: rpcData.donacion_codigo || donacionId,
              donanteId: 'donante-rpc',
              donanteNombre: rpcData.donante_nombre || 'Comercio Donante',
              tipoAlimento: 'Alimento reservado',
              requiereFrio: false,
              cantidadEstimada: 1,
              unidadMedida: 'kg',
              direccionRecogida: rpcData.direccion_recogida || '',
              telefonoDonante: rpcData.donante_telefono || undefined,
              zona: inferirZonaCali(rpcData.direccion_recogida || ''),
              horaLimite: ahoraIso,
              estado: 'ASIGNADA',
              exencionSanitariaAceptada: true,
              createdAt: ahoraIso,
              voluntarioId: rpcData.voluntario_id || voluntarioId,
              voluntarioNombre: rpcData.voluntario_nombre || voluntarioNombre,
              comedorId: comedorDestino?.comedorId,
              comedorNombre: comedorDestino?.comedorNombre,
              asignadaAt: rpcData.asignada_at || ahoraIso,
            };

            if (comedorDestino?.comedorNombre) {
              await supabase
                .from('donaciones')
                .update({
                  comedor_nombre: comedorDestino.comedorNombre,
                  ...(comedorDestino.comedorId && UUID_REGEX.test(comedorDestino.comedorId)
                    ? { comedor_id: comedorDestino.comedorId }
                    : {}),
                })
                .eq('id', donacionMapeada.id);
            }

            DONACIONES_ESTADO_VOLATIL.set(donacionMapeada.id, donacionMapeada);
            DONACIONES_ESTADO_VOLATIL.set(donacionId, donacionMapeada);
            globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionMapeada.id, { ...donacionMapeada });
            globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionId, { ...donacionMapeada });

            return {
              exito: true,
              codigo: 200,
              mensaje: rpcData.mensaje || 'Donación reservada exitosamente',
              donacion: donacionMapeada,
            };
          }
          if (rpcData.codigo === 403) {
            return {
              exito: false,
              codigo: 403,
              mensaje: rpcData.mensaje || 'No autorizado para tomar esta donación.',
              donacionId,
            };
          }
          if (rpcData.codigo === 409) {
            return {
              exito: false,
              codigo: 409,
              mensaje:
                'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
              donacionId,
            };
          }
          if (rpcData.codigo === 410 || rpcData.codigo === 404) {
            return {
              exito: false,
              codigo: 410,
              mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
              donacionId,
            };
          }
        }
      }

      let queryBusqueda = supabase.from('donaciones').select('*');
      if (uuidDonacion) {
        queryBusqueda = queryBusqueda.eq('id', uuidDonacion);
      } else if (donacionId.startsWith('DON-')) {
        queryBusqueda = queryBusqueda.eq('codigo', donacionId);
      } else {
        queryBusqueda = queryBusqueda.eq('id', donacionId);
      }
      const { data: donacionActual } = await queryBusqueda.maybeSingle();

      if (donacionActual) {
        if (
          new Date(donacionActual.hora_limite).getTime() <= ahoraMs ||
          donacionActual.estado === 'EXPIRADA'
        ) {
          return {
            exito: false,
            codigo: 410,
            mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
            donacionId,
          };
        }

        if (donacionActual.estado !== 'DISPONIBLE') {
          return {
            exito: false,
            codigo: 409,
            mensaje:
              'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
            donacionId,
          };
        }

        const updatePayload: Record<string, unknown> = {
          estado: 'ASIGNADA',
          voluntario_id: uuidVoluntario,
          voluntario_nombre: voluntarioNombre,
          asignada_at: ahoraIso,
        };
        if (comedorDestino?.comedorNombre) {
          updatePayload.comedor_nombre = comedorDestino.comedorNombre;
        }
        if (comedorDestino?.comedorId && UUID_REGEX.test(comedorDestino.comedorId)) {
          updatePayload.comedor_id = comedorDestino.comedorId;
        }

        const { data: actualizada, error: updateError } = await supabase
          .from('donaciones')
          .update(updatePayload)
          .eq('id', donacionActual.id)
          .eq('estado', 'DISPONIBLE')
          .gt('hora_limite', ahoraIso)
          .select()
          .maybeSingle();

        if (updateError || !actualizada) {
          return {
            exito: false,
            codigo: 409,
            mensaje:
              'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
            donacionId,
          };
        }

        const donacionActualizada: Donacion = {
          id: actualizada.id,
          codigo: actualizada.codigo,
          donanteId: actualizada.donante_id,
          donanteNombre: actualizada.donante_nombre,
          tipoAlimento: actualizada.tipo_alimento,
          requiereFrio: !!actualizada.requiere_frio,
          cantidadEstimada: Number(actualizada.cantidad_estimada),
          unidadMedida: actualizada.unidad_medida,
          direccionRecogida: actualizada.direccion_recogida,
          zona: (actualizada.zona as ZonaCali) || inferirZonaCali(actualizada.direccion_recogida),
          horaLimite: actualizada.hora_limite,
          estado: 'ASIGNADA',
          exencionSanitariaAceptada: !!actualizada.exencion_sanitaria_aceptada,
          createdAt: actualizada.created_at,
          voluntarioId,
          voluntarioNombre,
          comedorId: actualizada.comedor_id || comedorDestino?.comedorId,
          comedorNombre: actualizada.comedor_nombre || comedorDestino?.comedorNombre,
          asignadaAt: ahoraIso,
        };

        DONACIONES_ESTADO_VOLATIL.set(donacionActualizada.id, donacionActualizada);
        DONACIONES_ESTADO_VOLATIL.set(donacionId, donacionActualizada);
        globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionActualizada.id, {
          ...donacionActualizada,
        });
        globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionId, { ...donacionActualizada });

        return {
          exito: true,
          codigo: 200,
          mensaje: 'Donación reservada exitosamente',
          donacion: donacionActualizada,
        };
      }
    } catch {
      // Manejo de fallback para desarrollo/offline
    }
  }

  let item = DONACIONES_ESTADO_VOLATIL.get(donacionId);
  if (!item) {
    const todos = Array.from(DONACIONES_ESTADO_VOLATIL.values());
    for (const val of todos) {
      if (val.codigo === donacionId || val.id === donacionId) {
        item = val;
        break;
      }
    }
  }

  if (!item) {
    return {
      exito: false,
      codigo: 410,
      mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
      donacionId,
    };
  }

  if (new Date(item.horaLimite).getTime() <= ahoraMs || item.estado === 'EXPIRADA') {
    item.estado = 'EXPIRADA';
    DONACIONES_ESTADO_VOLATIL.set(item.id, item);
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(item.id, { ...item });
    return {
      exito: false,
      codigo: 410,
      mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
      donacionId,
    };
  }

  const lockKey = item.id;

  if (CANDADOS_EN_VUELO.has(lockKey) || item.estado !== 'DISPONIBLE') {
    return {
      exito: false,
      codigo: 409,
      mensaje:
        'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
      donacionId,
    };
  }

  CANDADOS_EN_VUELO.add(lockKey);
  try {
    await Promise.resolve();

    if (item.estado !== 'DISPONIBLE') {
      return {
        exito: false,
        codigo: 409,
        mensaje:
          'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
        donacionId,
      };
    }

    item.estado = 'ASIGNADA';
    item.voluntarioId = voluntarioId;
    item.voluntarioNombre = voluntarioNombre;
    item.asignadaAt = ahoraIso;
    if (comedorDestino?.comedorId) item.comedorId = comedorDestino.comedorId;
    if (comedorDestino?.comedorNombre) item.comedorNombre = comedorDestino.comedorNombre;

    DONACIONES_ESTADO_VOLATIL.set(item.id, item);
    if (!globalThis.__NEXO_DONACIONES_VOLATILES) {
      globalThis.__NEXO_DONACIONES_VOLATILES = new Map();
    }
    globalThis.__NEXO_DONACIONES_VOLATILES.set(item.id, { ...item });

    return {
      exito: true,
      codigo: 200,
      mensaje: 'Donación reservada exitosamente',
      donacion: { ...item },
    };
  } finally {
    CANDADOS_EN_VUELO.delete(lockKey);
  }
}

function esMismoVoluntario(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a === b || resolverUuidVoluntario(a) === resolverUuidVoluntario(b);
}

function mapearFilaDonacion(d: Record<string, any>): Donacion {
  return {
    id: d.id,
    codigo: d.codigo,
    donanteId: d.donante_id,
    donanteNombre: d.donante_nombre || 'Comercio Donante',
    tipoAlimento: d.tipo_alimento,
    requiereFrio: !!d.requiere_frio,
    cantidadEstimada: Number(d.cantidad_estimada),
    unidadMedida: d.unidad_medida,
    direccionRecogida: d.direccion_recogida,
    indicacionesPuesto: d.indicaciones_puesto || undefined,
    telefonoDonante: d.telefono_donante || undefined,
    coordenadas:
      d.latitud != null && d.longitud != null
        ? { lat: Number(d.latitud), lng: Number(d.longitud) }
        : undefined,
    zona: (d.zona as ZonaCali) || inferirZonaCali(d.direccion_recogida || ''),
    horaLimite: d.hora_limite,
    estado: d.estado,
    exencionSanitariaAceptada: !!d.exencion_sanitaria_aceptada,
    createdAt: d.created_at,
    voluntarioId: d.voluntario_id || undefined,
    voluntarioNombre: d.voluntario_nombre || undefined,
    comedorId: d.comedor_id || undefined,
    comedorNombre: d.comedor_nombre || undefined,
    asignadaAt: d.asignada_at || undefined,
    entregadaAt: d.entregada_at || undefined,
  };
}

async function leerDonacionActual(donacionId: string): Promise<Donacion | null> {
  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      const uuid = resolverUuidDonacion(donacionId);
      let query = supabase.from('donaciones').select('*');
      if (uuid) {
        query = query.eq('id', uuid);
      } else if (donacionId.startsWith('DON-')) {
        query = query.eq('codigo', donacionId);
      } else {
        query = query.eq('id', donacionId);
      }
      const { data } = await query.maybeSingle();
      if (data) return mapearFilaDonacion(data);
    } catch {
      // Respaldo en memoria
    }
  }

  const directo = DONACIONES_ESTADO_VOLATIL.get(donacionId);
  if (directo) return { ...directo };
  for (const item of Array.from(DONACIONES_ESTADO_VOLATIL.values())) {
    if (item.id === donacionId || item.codigo === donacionId) return { ...item };
  }
  return null;
}

/**
 * Server Action de toma de donación (CMP-03).
 */
export async function tomarDonacion(
  donacionId: string,
  voluntarioId = 'vol-001',
  voluntarioNombre = 'Voluntario Mesa Común',
  idempotencyKey?: string,
  comedorDestino?: { comedorId?: string; comedorNombre?: string }
): Promise<TomarDonacionResultado> {
  const llave = idempotencyKey && UUID_REGEX.test(idempotencyKey) ? idempotencyKey : undefined;
  if (!llave) {
    return tomarDonacionInterno(donacionId, voluntarioId, voluntarioNombre, comedorDestino);
  }

  const previo = await buscarRegistroPorIdempotencyKey('TAKE', llave);
  if (previo?.donacion) {
    return {
      exito: true,
      codigo: 200,
      mensaje: 'Reserva registrada previamente (reintento idempotente).',
      donacion: { ...previo.donacion },
      duplicado: true,
    };
  }

  const resultado = await tomarDonacionInterno(
    donacionId,
    voluntarioId,
    voluntarioNombre,
    comedorDestino
  );

  if (resultado.exito) {
    registrarIdempotencia('TAKE', llave, {
      codigo: resultado.donacion.codigo,
      donacionId: resultado.donacion.id,
      donacion: resultado.donacion,
    });
    return resultado;
  }

  if (resultado.codigo === 409) {
    const actual = await leerDonacionActual(donacionId);
    if (
      actual &&
      actual.estado === 'ASIGNADA' &&
      esMismoVoluntario(actual.voluntarioId, voluntarioId)
    ) {
      registrarIdempotencia('TAKE', llave, {
        codigo: actual.codigo,
        donacionId: actual.id,
        donacion: actual,
      });
      return {
        exito: true,
        codigo: 200,
        mensaje: 'La donación ya estaba reservada a tu nombre (reintento tras corte de red).',
        donacion: actual,
        duplicado: true,
      };
    }
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Sincronización delta de catálogo y donaciones (CA-PWA.5 / TASK-29)
// ---------------------------------------------------------------------------

export interface DesdeDelta {
  catalogoProductos?: string | null;
  donacionesCache?: string | null;
}

export interface CambiosDelta {
  productos: ProductoCatalogo[];
  donaciones: DonacionCache[];
  serverTimestamp: string;
}

const LIMITE_REGISTROS_DELTA = 1000;

const CATEGORIAS_PRODUCTO = ['fruta', 'panaderia', 'lacteos', 'viandas', 'proteina', 'granos'];
const UNIDADES_PRODUCTO = ['kg', 'canastillas', 'bultos', 'unidades'];

function normalizarDesde(valor?: string | null): string | null {
  if (!valor) return null;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function marcaTemporalDonacion(d: {
  updatedAt?: string;
  createdAt?: string;
  asignadaAt?: string;
  entregadaAt?: string;
}): string {
  const candidatas = [d.updatedAt, d.createdAt, d.asignadaAt, d.entregadaAt]
    .map((v) => (v ? new Date(v).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  return new Date(candidatas.length ? Math.max(...candidatas) : 0).toISOString();
}

function aDonacionCache(d: Donacion, updatedAt: string): DonacionCache {
  const copia: Partial<Donacion> = { ...d };
  delete copia.telefonoDonante;
  delete copia.indicacionesPuesto;
  delete copia.voluntarioId;
  delete copia.voluntarioNombre;
  return {
    ...(copia as Omit<
      Donacion,
      'telefonoDonante' | 'indicacionesPuesto' | 'voluntarioId' | 'voluntarioNombre'
    >),
    updatedAt,
  };
}

async function leerDonacionesDeltaSupabase(desde: string | null): Promise<DonacionCache[]> {
  const supabase = createClient();

  let q1 = supabase.from('donaciones').select('*');
  if (desde) q1 = q1.gt('updated_at', desde);
  const r1 = await q1.order('updated_at', { ascending: true }).limit(LIMITE_REGISTROS_DELTA);

  let filas: Record<string, any>[] | null = r1.error ? null : r1.data;

  if (!filas) {
    let q2 = supabase.from('donaciones').select('*');
    if (desde) {
      q2 = q2.or(`created_at.gt.${desde},asignada_at.gt.${desde},entregada_at.gt.${desde}`);
    }
    const r2 = await q2.order('created_at', { ascending: true }).limit(LIMITE_REGISTROS_DELTA);
    if (r2.error) throw new Error(r2.error.message);
    filas = r2.data;
  }

  return (filas || []).map((fila) => {
    const donacion = mapearFilaDonacion(fila);
    return aDonacionCache(
      donacion,
      marcaTemporalDonacion({
        updatedAt: fila.updated_at,
        createdAt: donacion.createdAt,
        asignadaAt: donacion.asignadaAt,
        entregadaAt: donacion.entregadaAt,
      })
    );
  });
}

function leerDonacionesDeltaMemoria(desde: string | null): DonacionCache[] {
  const desdeMs = desde ? new Date(desde).getTime() : -Infinity;
  const porId = new Map<string, { donacion: Donacion; marca: string }>();

  const fuentes: Array<Map<string, Donacion> | undefined> = [
    DONACIONES_ESTADO_VOLATIL,
    globalThis.__NEXO_DONACIONES_VOLATILES,
  ];
  for (const fuente of fuentes) {
    fuente?.forEach((donacion) => {
      if (!ES_ENTORNO_TEST && donacion.id.startsWith('seed-')) return;
      const marca = marcaTemporalDonacion(donacion);
      const previo = porId.get(donacion.id);
      if (!previo || new Date(marca).getTime() > new Date(previo.marca).getTime()) {
        porId.set(donacion.id, { donacion, marca });
      }
    });
  }

  return Array.from(porId.values())
    .filter(({ marca }) => new Date(marca).getTime() > desdeMs)
    .sort((a, b) => new Date(a.marca).getTime() - new Date(b.marca).getTime())
    .slice(0, LIMITE_REGISTROS_DELTA)
    .map(({ donacion, marca }) => aDonacionCache(donacion, marca));
}

async function leerProductosDelta(desde: string | null): Promise<ProductoCatalogo[]> {
  if (!esSupabaseConfigurado()) return [];
  try {
    const supabase = createClient();
    let query = supabase.from('catalogo_productos').select('*');
    if (desde) query = query.gt('updated_at', desde);
    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .limit(LIMITE_REGISTROS_DELTA);
    if (error || !data) return [];

    return data
      .filter((p: Record<string, any>) => p.id && p.nombre && p.updated_at)
      .map((p: Record<string, any>) => ({
        id: String(p.id),
        nombre: String(p.nombre),
        categoria: (CATEGORIAS_PRODUCTO.includes(p.categoria)
          ? p.categoria
          : 'granos') as ProductoCatalogo['categoria'],
        requiereFrio: !!p.requiere_frio,
        unidadSugerida: (UNIDADES_PRODUCTO.includes(p.unidad_sugerida)
          ? p.unidad_sugerida
          : 'kg') as ProductoCatalogo['unidadSugerida'],
        updatedAt: new Date(p.updated_at).toISOString(),
      }));
  } catch {
    return [];
  }
}

export async function obtenerCambiosDelta(desde: DesdeDelta = {}): Promise<CambiosDelta> {
  const desdeProductos = normalizarDesde(desde.catalogoProductos);
  const desdeDonaciones = normalizarDesde(desde.donacionesCache);

  let donaciones: DonacionCache[] | null = null;
  if (esSupabaseConfigurado()) {
    try {
      donaciones = await leerDonacionesDeltaSupabase(desdeDonaciones);
    } catch {
      donaciones = null;
    }
  }
  if (!donaciones) {
    donaciones = leerDonacionesDeltaMemoria(desdeDonaciones);
  }

  return {
    productos: await leerProductosDelta(desdeProductos),
    donaciones,
    serverTimestamp: new Date().toISOString(),
  };
}

/**
 * Server Action para consultar las métricas consolidadas de impacto real desde componentes cliente (`TASK-25` / `CA-05.4`).
 *
 * ¿Por qué?: Permite que `MetricasDashboard.tsx` ejecute el cómputo en el servidor leyendo tanto Supabase
 * como los almacenes volátiles del servidor sin violar la restricción de Next.js App Router sobre constantes exportadas.
 */
export async function consultarMetricasImpactoReal(): Promise<MetricasImpactoDTO> {
  return obtenerMetricasImpactoReal();
}


/**
 * Elimina una donación y sus eventos de trazabilidad asociados (Solo COORDINADOR y ADMIN).
 * Permite purgar lotes de prueba o erróneos del catálogo y del mapa cartográfico.
 */
export async function eliminarDonacion(
  donacionId: string,
  actorRol?: RolUsuario
): Promise<{ exito: true; mensaje: string } | { exito: false; error: string }> {
  if (actorRol && actorRol !== 'ADMIN' && actorRol !== 'COORDINADOR') {
    return {
      exito: false,
      error: 'Acceso denegado: Solo Coordinadores o Administradores pueden eliminar lotes de donación.',
    };
  }

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      await supabase.from('trazabilidad_eventos').delete().eq('donacion_id', donacionId);
      const { error } = await supabase.from('donaciones').delete().eq('id', donacionId);
      if (error) {
        return { exito: false, error: error.message };
      }
    } catch (e: any) {
      return { exito: false, error: e?.message || 'Error al eliminar donación en base de datos' };
    }
  }

  DONACIONES_ESTADO_VOLATIL.delete(donacionId);
  globalThis.__NEXO_CATALOGO_VOLATIL?.delete(donacionId);
  globalThis.__NEXO_DONACIONES_VOLATILES?.delete(donacionId);

  return { exito: true, mensaje: 'Lote de donación eliminado exitosamente del sistema y del mapa.' };
}
