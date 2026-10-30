'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import type { Donacion, ZonaCali } from '@/types';
import {
  normalizarFechaHoraLimite,
  inferirZonaCali,
  filtrarDonacionesDisponibles,
} from '@/lib/utils/donaciones-helper';

export type PublicarDonacionResultado =
  | { exito: true; codigo: string }
  | { exito: false; error: string };

export type TomarDonacionResultado =
  | { exito: true; codigo: 200; mensaje: string; donacion: Donacion }
  | { exito: false; codigo: 409; mensaje: string; donacionId: string }
  | { exito: false; codigo: 410; mensaje: string; donacionId: string }
  | { exito: false; codigo: 500; mensaje: string; donacionId: string };

declare global {
  // eslint-disable-next-line no-var
  var __NEXO_CATALOGO_VOLATIL: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_DONACIONES_VOLATILES: Map<string, Donacion> | undefined;
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
 */
export async function publicarDonacion(input: DonacionInput): Promise<PublicarDonacionResultado> {
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

  const data = parseResult.data;
  const horaIsoNormalizada = normalizarFechaHoraLimite(data.horaLimite);
  const supabase = createClient();
  const zonaDetectada = inferirZonaCali(`${data.direccionRecogida} ${data.donanteNombre || ''}`);

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

  const { data: donacion, error } = await supabase
    .from('donaciones')
    .insert([payload])
    .select('codigo')
    .single();

  if (error) {
    return {
      exito: false,
      error: error.message || 'Error al registrar la donación en la base de datos',
    };
  }

  const codigoFinal = donacion?.codigo || `DON-${Date.now().toString().slice(-4)}`;
  const nuevaDonacion: Donacion = {
    id: codigoFinal,
    codigo: codigoFinal,
    donanteId: payload.donante_id,
    donanteNombre: payload.donante_nombre,
    tipoAlimento: payload.tipo_alimento,
    requiereFrio: payload.requiere_frio,
    cantidadEstimada: payload.cantidad_estimada,
    unidadMedida: payload.unidad_medida,
    direccionRecogida: payload.direccion_recogida,
    zona: zonaDetectada,
    horaLimite: horaIsoNormalizada,
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  };

  DONACIONES_ESTADO_VOLATIL.set(nuevaDonacion.id, nuevaDonacion);
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(nuevaDonacion.id, { ...nuevaDonacion });

  return {
    exito: true,
    codigo: codigoFinal,
  };
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
export async function tomarDonacion(
  donacionId: string,
  voluntarioId = 'vol-001',
  voluntarioNombre = 'Voluntario Mesa Común'
): Promise<TomarDonacionResultado> {
  const ahoraIso = new Date().toISOString();
  const ahoraMs = Date.now();

  if (esSupabaseConfigurado()) {
    try {
      const supabase = createClient();

      // 1. Invocar procedimiento atómico `tomar_donacion` en PostgreSQL (TASK-08)
      const { data: rpcData, error: rpcError } = await supabase.rpc('tomar_donacion', {
        p_donacion_id: donacionId,
        p_voluntario_id: voluntarioId,
        p_voluntario_nombre: voluntarioNombre,
      });

      if (!rpcError && rpcData) {
        if (rpcData.codigo === 200) {
          const donacionMapeada: Donacion = rpcData.donacion || {
            id: rpcData.donacion_id || donacionId,
            codigo: rpcData.donacion_codigo || 'DON-000',
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
          globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionMapeada.id, { ...donacionMapeada });

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

      // 2. Consulta con compuerta atómica WHERE estado = 'DISPONIBLE' AND hora_limite > NOW()
      let queryBusqueda = supabase.from('donaciones').select('*');
      if (donacionId.startsWith('DON-')) {
        queryBusqueda = queryBusqueda.eq('codigo', donacionId);
      } else {
        queryBusqueda = queryBusqueda.eq('id', donacionId);
      }
      const { data: donacionActual } = await queryBusqueda.single();

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
            voluntario_id: voluntarioId,
            voluntario_nombre: voluntarioNombre,
            asignada_at: ahoraIso,
          })
          .eq('id', donacionActual.id)
          .eq('estado', 'DISPONIBLE')
          .gt('hora_limite', ahoraIso)
          .select()
          .single();

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
        globalThis.__NEXO_DONACIONES_VOLATILES?.set(donacionActualizada.id, { ...donacionActualizada });

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
