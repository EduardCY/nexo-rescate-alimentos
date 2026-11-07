'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import type { Donacion, ZonaCali } from '@/types';
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
  | { exito: false; codigo: 409; mensaje: string; donacionId: string }
  | { exito: false; codigo: 410; mensaje: string; donacionId: string }
  | { exito: false; codigo: 500; mensaje: string; donacionId: string };

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_CATALOGO_VOLATIL: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_DONACIONES_VOLATILES: Map<string, Donacion> | undefined;
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
 * Registro en memoria de llaves de idempotencia ya procesadas (`CREATE:<uuid>`, `TAKE:<uuid>`).
 *
 * Limitación conocida: en Vercel cada lambda tiene su propia memoria, así que este registro solo
 * evita duplicados dentro de una misma instancia. La garantía entre instancias la da la base de datos
 * (columna única `idempotency_key` para CREATE y el estado de la fila para TAKE).
 */
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

/** Errores de PostgREST/Postgres cuando la columna idempotency_key aún no existe en la tabla. */
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

/** Violación de unicidad sobre idempotency_key: otro reintento ganó la carrera. */
function esConflictoIdempotencia(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '23505' && (error.message || '').toLowerCase().includes('idempotency');
}

/**
 * Busca si una llave de idempotencia ya fue procesada: primero en memoria y luego, para CREATE,
 * en la columna `idempotency_key` de Supabase (si existe).
 */
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

/** Estado en memoria para desarrollo local, pruebas y fallback offline de concurrencia */
const DONACIONES_ESTADO_VOLATIL: Map<string, Donacion> =
  globalThis.__NEXO_CATALOGO_VOLATIL ||
  new Map<string, Donacion>([
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
        coordenadas: { lat: 3.4190, lng: -76.5560 },
        comedorNombre: 'Comedor Comunitario Siloé Esperanza',
        zona: 'LADERA',
        horaLimite: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

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
 *
 * ¿Por qué?: Garantiza consistencia relacional permanente cuando el temporizador de una oferta
 * vence en el cliente o al ser auditada, evitando que vuelva a mostrarse como disponible.
 *
 * @param donacionId Identificador o código de la donación vencida.
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
 *
 * Idempotencia (CA-01.5 / TASK-29): si se recibe `meta.idempotencyKey` y esa llave ya fue procesada,
 * se devuelve el código original con `duplicada: true` sin crear un segundo registro. La llave y el
 * código determinista offline se guardan en `idempotency_key` y `codigo_origen_offline`.
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

  // Reintento de red: si la llave ya fue procesada, se devuelve el resultado original.
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

  const payload = {
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

  const construirDonacion = (id: string, codigo: string): Donacion => ({
    id,
    codigo,
    donanteId: payload.donante_id,
    donanteNombre: payload.donante_nombre,
    tipoAlimento: payload.tipo_alimento,
    requiereFrio: payload.requiere_frio,
    cantidadEstimada: payload.cantidad_estimada,
    unidadMedida: payload.unidad_medida,
    direccionRecogida: payload.direccion_recogida,
    indicacionesPuesto: data.indicacionesPuesto,
    telefonoDonante: data.telefonoDonante,
    coordenadas: data.coordenadas,
    zona: zonaDetectada,
    horaLimite: horaIsoNormalizada,
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  });

  const registrarEnMemoria = (nueva: Donacion) => {
    DONACIONES_ESTADO_VOLATIL.set(nueva.id, nueva);
    DONACIONES_ESTADO_VOLATIL.set(nueva.codigo, nueva);
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(nueva.id, { ...nueva });
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(nueva.codigo, { ...nueva });
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
        // Dos reintentos simultáneos: gana el primero, el segundo recibe el mismo código.
        const existente = await buscarRegistroPorIdempotencyKey('CREATE', idempotencyKey);
        if (existente) {
          return { exito: true, codigo: existente.codigo, duplicada: true };
        }
      } else if (esColumnaIdempotenciaInexistente(error)) {
        // La migración de idempotencia aún no está aplicada: se publica sin las columnas nuevas.
        ({ data: donacion, error } = await supabase
          .from('donaciones')
          .insert([payload])
          .select('id, codigo')
          .single());
      }
    }

    if (error) {
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
    // Modo offline / pruebas en memoria sin base de datos
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
 * En modo Supabase o fallback en memoria, utiliza la función pura determinística `filtrarDonacionesDisponibles`.
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

      if (!error && data && data.length > 0) {
        const mapeadas: Donacion[] = data.map((d) => ({
          id: d.id,
          codigo: d.codigo,
          donanteId: d.donante_id,
          donanteNombre: d.donante_nombre || 'Comercio Donante',
          tipoAlimento: d.tipo_alimento,
          requiereFrio: !!d.requiere_frio,
          cantidadEstimada: Number(d.cantidad_estimada),
          unidadMedida: d.unidad_medida,
          direccionRecogida: d.direccion_recogida,
          zona: (d.zona as ZonaCali) || inferirZonaCali(d.direccion_recogida),
          horaLimite: d.hora_limite,
          estado: d.estado,
          exencionSanitariaAceptada: !!d.exencion_sanitaria_aceptada,
          createdAt: d.created_at,
          voluntarioId: d.voluntario_id,
          voluntarioNombre: d.voluntario_nombre,
          comedorId: d.comedor_id,
          comedorNombre: d.comedor_nombre,
        }));
        return filtrarDonacionesDisponibles(mapeadas, { zona });
      }
    } catch {
      // Fallback a memoria si Supabase no está conectado
    }
  }

  const lista: Donacion[] = Array.from(DONACIONES_ESTADO_VOLATIL.values());
  return filtrarDonacionesDisponibles(lista, { zona });
}

/**
 * Server Action para tomar/reservar una donación con control atómico de concurrencia (TASK-09 / CMP-03).
 * Satisface CA-03.2 (colisión HTTP 409 con mensaje empático) y CA-03.3 (bloqueo sobre expiradas/canceladas).
 * Conecta directamente con la función RPC `tomar_donacion` (TASK-08 / PR #24).
 *
 * Busca la oferta tanto por identificador UUID (`id`) como por código de negocio (`codigo`, ej. 'DON-CONCURRENT-01').
 */
async function tomarDonacionInterno(
  donacionId: string,
  voluntarioId = 'vol-001',
  voluntarioNombre = 'Voluntario Mesa Común'
): Promise<TomarDonacionResultado> {
  const ahoraIso = new Date().toISOString();
  const ahoraMs = Date.now();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();
      let uuidDonacion = resolverUuidDonacion(donacionId);
      const uuidVoluntario = resolverUuidVoluntario(voluntarioId);

      // Si no es un UUID conocido, resolver consultando por código
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

      // 1. Invocar procedimiento atómico `tomar_donacion` en PostgreSQL si tenemos UUID válido
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
              asignadaAt: rpcData.asignada_at || ahoraIso,
            };

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

      // 2. Consulta con compuerta atómica WHERE estado = 'DISPONIBLE' AND hora_limite > NOW()
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

        // Actualización atómica con condición de estado
        const { data: actualizada, error: updateError } = await supabase
          .from('donaciones')
          .update({
            estado: 'ASIGNADA',
            voluntario_id: uuidVoluntario,
            voluntario_nombre: voluntarioNombre,
            asignada_at: ahoraIso,
          })
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
          asignadaAt: ahoraIso,
        };

        DONACIONES_ESTADO_VOLATIL.set(donacionActualizada.id, donacionActualizada);
        DONACIONES_ESTADO_VOLATIL.set(donacionId, donacionActualizada);
        globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionActualizada.id, { ...donacionActualizada });
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

  // Fallback atómico en memoria para pruebas de concurrencia y modo offline
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

  // Verificación atómica inmediata si ya está asignada o en proceso de reserva
  if (CANDADOS_EN_VUELO.has(lockKey) || item.estado !== 'DISPONIBLE') {
    return {
      exito: false,
      codigo: 409,
      mensaje:
        'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
      donacionId,
    };
  }

  // Adquirir candado atómico
  CANDADOS_EN_VUELO.add(lockKey);
  try {
    // Ceder el turno en el event loop (microtask) para simular entrelazado de llamadas simultáneas
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

    // Transición atómica exitosa
    item.estado = 'ASIGNADA';
    item.voluntarioId = voluntarioId;
    item.voluntarioNombre = voluntarioNombre;
    item.asignadaAt = ahoraIso;
    DONACIONES_ESTADO_VOLATIL.set(item.id, item);
    globalThis.__NEXO_DONACIONES_VOLATILES?.set(item.id, { ...item });

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

/** Dos identificadores de voluntario son equivalentes si coinciden o resuelven al mismo UUID canónico. */
function esMismoVoluntario(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a === b || resolverUuidVoluntario(a) === resolverUuidVoluntario(b);
}

/** Convierte una fila de Supabase (snake_case) a la entidad de dominio. */
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

/** Lee el estado vigente de una donación (Supabase si está configurado; memoria como respaldo). */
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
 * Server Action de toma de donación (CMP-03). Con `idempotencyKey` es segura ante reintentos de red
 * desde el outbox offline (TASK-29): si la llave ya se procesó, o si la donación ya quedó asignada
 * al mismo voluntario, responde éxito con `duplicado: true` en lugar de un falso conflicto 409.
 * Sin `idempotencyKey` el comportamiento es idéntico al original (reserva única, 409/410).
 */
export async function tomarDonacion(
  donacionId: string,
  voluntarioId = 'vol-001',
  voluntarioNombre = 'Voluntario Mesa Común',
  idempotencyKey?: string
): Promise<TomarDonacionResultado> {
  const llave = idempotencyKey && UUID_REGEX.test(idempotencyKey) ? idempotencyKey : undefined;
  if (!llave) {
    return tomarDonacionInterno(donacionId, voluntarioId, voluntarioNombre);
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

  const resultado = await tomarDonacionInterno(donacionId, voluntarioId, voluntarioNombre);

  if (resultado.exito) {
    registrarIdempotencia('TAKE', llave, {
      codigo: resultado.donacion.codigo,
      donacionId: resultado.donacion.id,
      donacion: resultado.donacion,
    });
    return resultado;
  }

  if (resultado.codigo === 409) {
    // Reintento tras corte de red: la primera petición sí llegó y la reserva ya es de este voluntario.
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

/** `last_sync_timestamp` por recurso; null = primera sincronización (trae todo). */
export interface DesdeDelta {
  catalogoProductos?: string | null;
  donacionesCache?: string | null;
}

export interface CambiosDelta {
  /** Solo productos con updated_at > desde.catalogoProductos. */
  productos: ProductoCatalogo[];
  /** Solo donaciones con updated_at > desde.donacionesCache (sin datos de contacto). */
  donaciones: DonacionCache[];
  /** Hora del servidor al responder (informativa). */
  serverTimestamp: string;
}

/** Máximo de registros por recurso en una respuesta delta (volumen del piloto: 8-15 rescates/semana). */
const LIMITE_REGISTROS_DELTA = 1000;

const CATEGORIAS_PRODUCTO = ['fruta', 'panaderia', 'lacteos', 'viandas', 'proteina', 'granos'];
const UNIDADES_PRODUCTO = ['kg', 'canastillas', 'bultos', 'unidades'];

/** Acepta solo fechas válidas y las re-serializa a ISO: evita inyectar texto en filtros de PostgREST. */
function normalizarDesde(valor?: string | null): string | null {
  if (!valor) return null;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Marca temporal de última modificación: updated_at si existe; si no, la mayor entre created/asignada/entregada. */
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

/** Proyección para caché: elimina contacto del donante y datos del voluntario (se revelan solo a quien reserva). */
function aDonacionCache(d: Donacion, updatedAt: string): DonacionCache {
  const copia: Partial<Donacion> = { ...d };
  delete copia.telefonoDonante;
  delete copia.indicacionesPuesto;
  delete copia.voluntarioId;
  delete copia.voluntarioNombre;
  return { ...(copia as Omit<Donacion, 'telefonoDonante' | 'indicacionesPuesto' | 'voluntarioId' | 'voluntarioNombre'>), updatedAt };
}

async function leerDonacionesDeltaSupabase(desde: string | null): Promise<DonacionCache[]> {
  const supabase = createClient();

  // 1) Con columna updated_at (esquema del plan técnico).
  let q1 = supabase.from('donaciones').select('*');
  if (desde) q1 = q1.gt('updated_at', desde);
  const r1 = await q1.order('updated_at', { ascending: true }).limit(LIMITE_REGISTROS_DELTA);

  let filas: Record<string, any>[] | null = r1.error ? null : r1.data;

  // 2) Esquema sin updated_at: se deriva de created_at / asignada_at / entregada_at.
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
  // El catálogo base viaja sembrado en el dispositivo; el servidor solo aporta cambios si existe la tabla.
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
        categoria: (CATEGORIAS_PRODUCTO.includes(p.categoria) ? p.categoria : 'granos') as ProductoCatalogo['categoria'],
        requiereFrio: !!p.requiere_frio,
        unidadSugerida: (UNIDADES_PRODUCTO.includes(p.unidad_sugerida) ? p.unidad_sugerida : 'kg') as ProductoCatalogo['unidadSugerida'],
        updatedAt: new Date(p.updated_at).toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * Devuelve únicamente los registros modificados después de `last_sync_timestamp` (updated_at > desde)
 * para `catalogo_productos` y `donaciones_cache`. El cliente (`sincronizarCatalogoDelta`) los aplica
 * en IndexedDB y avanza su marca. Cero costo extra: una sola consulta por recurso (RNF-005).
 */
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
