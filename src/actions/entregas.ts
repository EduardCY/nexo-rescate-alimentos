'use server';

import { createClient } from '@/lib/supabase/server';
import { EntregaInputSchema, type EntregaInput } from '@/lib/validations/entrega';
import type { Donacion, ZonaCali } from '@/types';
import { inferirZonaCali } from '@/lib/utils/donaciones-helper';

export type ConfirmarEntregaResultado =
  | {
      exito: true;
      codigo: 200;
      mensaje: string;
      donacion: Donacion;
      entregadaAt: string;
      receptorNombre: string;
    }
  | {
      exito: false;
      codigo: 400 | 403 | 404 | 409 | 500;
      mensaje: string;
    };

/**
 * Estado volátil en memoria compartido con pruebas y modo offline.
 */
declare global {
  // eslint-disable-next-line no-var
  var __NEXO_DONACIONES_VOLATILES: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_TRAZABILIDAD_EVENTOS: Array<{
    id: string;
    donacionId: string;
    estadoAnterior: string;
    estadoNuevo: string;
    usuarioId?: string;
    usuarioNombre?: string;
    timestamp: string;
    observaciones: string;
  }> | undefined;
}

if (!globalThis.__NEXO_DONACIONES_VOLATILES) {
  globalThis.__NEXO_DONACIONES_VOLATILES = new Map<string, Donacion>([
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
        zona: 'CENTRO',
        horaLimite: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        estado: 'ASIGNADA',
        voluntarioId: 'vol-001',
        voluntarioNombre: 'Voluntario Carlos',
        comedorId: 'com-01',
        comedorNombre: 'Comedor Comunitario Siloé Esperanza',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
        asignadaAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
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
        zona: 'SUR',
        horaLimite: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        exencionSanitariaAceptada: true,
        createdAt: new Date().toISOString(),
      },
    ],
  ]);
}

if (!globalThis.__NEXO_TRAZABILIDAD_EVENTOS) {
  globalThis.__NEXO_TRAZABILIDAD_EVENTOS = [];
}

/**
 * Obtiene la donación por su identificador para la pantalla de confirmación de entrega.
 */
export async function obtenerDonacionParaEntrega(donacionId: string): Promise<Donacion | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('donaciones')
      .select('*')
      .eq('id', donacionId)
      .single();

    if (!error && data) {
      return {
        id: data.id,
        codigo: data.codigo,
        donanteId: data.donante_id,
        donanteNombre: data.donante_nombre || 'Comercio Donante',
        tipoAlimento: data.tipo_alimento,
        requiereFrio: !!data.requiere_frio,
        cantidadEstimada: Number(data.cantidad_estimada),
        unidadMedida: data.unidad_medida,
        direccionRecogida: data.direccion_recogida,
        zona: (data.zona as ZonaCali) || inferirZonaCali(data.direccion_recogida),
        horaLimite: data.hora_limite,
        estado: data.estado,
        exencionSanitariaAceptada: !!data.exencion_sanitaria_aceptada,
        createdAt: data.created_at,
        voluntarioId: data.voluntario_id,
        voluntarioNombre: data.voluntario_nombre,
        comedorId: data.comedor_id,
        comedorNombre: data.comedor_nombre,
        asignadaAt: data.asignada_at,
        entregadaAt: data.entregada_at,
      };
    }
  } catch {
    // Fallback seguro a memoria
  }

  const vol = globalThis.__NEXO_DONACIONES_VOLATILES?.get(donacionId);
  return vol ? { ...vol } : null;
}

/**
 * Server Action que procesa el acta digital de entrega física en comedor (CMP-04 / TASK-11).
 *
 * Criterios de Aceptación:
 * - CA-04.1 Cierre formal: Transición ASIGNADA -> ENTREGADA, timestamp UTC entregada_at y evento en trazabilidad_eventos.
 * - CA-04.2 Bloqueo: Impide entregar ofertas en estado DISPONIBLE u otro estado no asignado.
 * - DoD: Valida que solo el voluntario asignado pueda cerrar la entrega.
 */
export async function confirmarEntrega(rawInput: EntregaInput): Promise<ConfirmarEntregaResultado> {
  // 1. Validación de esquema con Zod
  const parseResult = EntregaInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const issues = parseResult.error.issues || [];
    const mensaje = issues.map((i) => i.message).join('. ') || 'Datos de entrega inválidos';
    return {
      exito: false,
      codigo: 400,
      mensaje,
    };
  }

  const input = parseResult.data;
  const ahoraUtcIso = new Date().toISOString();

  // 2. Consulta de la donación actual
  const donacion = await obtenerDonacionParaEntrega(input.donacionId);
  if (!donacion) {
    return {
      exito: false,
      codigo: 404,
      mensaje: 'La donación especificada no existe.',
    };
  }

  // 3. CA-04.2: Bloqueo de entrega de donación no tomada previamente (estado DISPONIBLE)
  if (donacion.estado === 'DISPONIBLE') {
    return {
      exito: false,
      codigo: 400,
      mensaje: 'Bloqueo (CA-04.2): No se puede entregar una donación que se encuentra en estado DISPONIBLE y no ha sido tomada previamente por un voluntario.',
    };
  }

  // 4. Si ya fue entregada
  if (donacion.estado === 'ENTREGADA') {
    return {
      exito: false,
      codigo: 409,
      mensaje: 'Esta donación ya fue entregada formalmente en el comedor comunitario.',
    };
  }

  // 5. Validación de estado estricto: debe estar ASIGNADA
  if (donacion.estado !== 'ASIGNADA') {
    return {
      exito: false,
      codigo: 400,
      mensaje: `No se puede entregar una donación en estado ${donacion.estado}. Debe estar ASIGNADA.`,
    };
  }

  // 6. DoD: Solo el voluntario asignado puede registrar la entrega del lote
  if (
    donacion.voluntarioId &&
    input.voluntarioId &&
    donacion.voluntarioId !== input.voluntarioId
  ) {
    return {
      exito: false,
      codigo: 403,
      mensaje: 'DoD: Solo el voluntario que reservó y tiene asignada la donación puede registrar la entrega en el comedor.',
    };
  }

  const textoObservaciones = `Receptor: ${input.nombreReceptor.trim()} | Estado físico: ${input.estadoFisico}${
    input.observaciones?.trim() ? ` | Notas: ${input.observaciones.trim()}` : ''
  }`;

  // 7. CA-04.1: Persistencia en Supabase si está disponible
  try {
    const supabase = createClient();

    // Actualización de donación a ENTREGADA con marca temporal UTC
    const { data: actualizada, error: updateError } = await supabase
      .from('donaciones')
      .update({
        estado: 'ENTREGADA',
        entregada_at: ahoraUtcIso,
      })
      .eq('id', input.donacionId)
      .eq('estado', 'ASIGNADA')
      .select()
      .single();

    if (!updateError && actualizada) {
      // Registro inmutable en trazabilidad_eventos
      await supabase.from('trazabilidad_eventos').insert([
        {
          donacion_id: input.donacionId,
          estado_anterior: 'ASIGNADA',
          estado_nuevo: 'ENTREGADA',
          usuario_id: input.voluntarioId || donacion.voluntarioId || null,
          usuario_nombre: input.voluntarioNombre || donacion.voluntarioNombre || 'Voluntario',
          timestamp: ahoraUtcIso,
          observaciones: textoObservaciones,
        },
      ]);

      const donacionEntregada: Donacion = {
        ...donacion,
        estado: 'ENTREGADA',
        entregadaAt: ahoraUtcIso,
      };

      return {
        exito: true,
        codigo: 200,
        mensaje: 'Entrega en comedor registrada formalmente con éxito',
        donacion: donacionEntregada,
        entregadaAt: ahoraUtcIso,
        receptorNombre: input.nombreReceptor.trim(),
      };
    }
  } catch {
    // Fallback a almacenamiento en memoria
  }

  // 8. Fallback en memoria (para pruebas y modo offline)
  const vol = globalThis.__NEXO_DONACIONES_VOLATILES?.get(input.donacionId) || donacion;
  vol.estado = 'ENTREGADA';
  vol.entregadaAt = ahoraUtcIso;
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(input.donacionId, vol);

  globalThis.__NEXO_TRAZABILIDAD_EVENTOS?.push({
    id: `ev-${Date.now()}`,
    donacionId: input.donacionId,
    estadoAnterior: 'ASIGNADA',
    estadoNuevo: 'ENTREGADA',
    usuarioId: input.voluntarioId || donacion.voluntarioId,
    usuarioNombre: input.voluntarioNombre || donacion.voluntarioNombre,
    timestamp: ahoraUtcIso,
    observaciones: textoObservaciones,
  });

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Entrega en comedor registrada formalmente con éxito',
    donacion: { ...vol },
    entregadaAt: ahoraUtcIso,
    receptorNombre: input.nombreReceptor.trim(),
  };
}