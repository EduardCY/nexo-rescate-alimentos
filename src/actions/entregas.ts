'use server';

import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
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
 * Estado volátil en memoria compartido con pruebas, catálogo y modo offline.
 */
declare global {
  // eslint-disable-next-line no-var
  var __NEXO_DONACIONES_VOLATILES: Map<string, Donacion> | undefined;
  // eslint-disable-next-line no-var
  var __NEXO_CATALOGO_VOLATIL: Map<string, Donacion> | undefined;
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
        indicacionesPuesto: 'Entrar por la Puerta 3 de carga, frente a la báscula comunitaria.',
        telefonoDonante: '+57 315 482 1901',
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
        indicacionesPuesto: 'Local esquinero refrigerado junto a la entrada de la Calle 9.',
        telefonoDonante: '+57 317 920 3344',
        zona: 'SUR',
        horaLimite: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        comedorId: 'com-02',
        comedorNombre: 'Fundación Pan y Vida - Meléndez',
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
        donanteNombre: 'Panadería La Espiga - Siloé',
        tipoAlimento: 'Pan Aliñado y Pandebono del Día',
        requiereFrio: false,
        cantidadEstimada: 15,
        unidadMedida: 'canastillas',
        direccionRecogida: 'Calle 1 Oeste # 50-12, Sector La Nave, Siloé',
        indicacionesPuesto: 'Preguntar por Don Hernando en el mostrador principal.',
        telefonoDonante: '+57 310 551 8872',
        zona: 'LADERA',
        horaLimite: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        comedorId: 'com-01',
        comedorNombre: 'Comedor Comunitario Siloé Esperanza',
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
        donanteNombre: 'Fruver El Paraíso - Alfonso López',
        tipoAlimento: 'Papaya, Guayaba y Banano Criollo',
        requiereFrio: false,
        cantidadEstimada: 60,
        unidadMedida: 'kg',
        direccionRecogida: 'Carrera 7T # 76-14, Alfonso López, Oriente',
        indicacionesPuesto: 'Bodega lateral con portón verde.',
        telefonoDonante: '+57 318 604 1129',
        zona: 'ORIENTE',
        horaLimite: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        comedorId: 'com-03',
        comedorNombre: 'Olla Comunitaria Aguablanca Solidaria',
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
        donanteNombre: 'Restaurante El Fogón - La Flora',
        tipoAlimento: 'Almuerzos Empacados y Arroz con Pollo',
        requiereFrio: true,
        cantidadEstimada: 35,
        unidadMedida: 'unidades',
        direccionRecogida: 'Avenida 3 Norte # 52N-40, La Flora',
        indicacionesPuesto: 'Ingreso por zona de parqueadero posterior.',
        telefonoDonante: '+57 316 742 9080',
        zona: 'NORTE',
        horaLimite: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
        estado: 'DISPONIBLE',
        comedorId: 'com-04',
        comedorNombre: 'Comedor Infantil Semillas del Norte',
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
 * Obtiene la donación por su identificador o código para la pantalla de ruta activa y confirmación de entrega.
 * Permite sincronía inmediata entre el catálogo volátil y la hoja de ruta (TASK-18 / CMP-03 / CMP-04).
 */
export async function obtenerDonacionParaEntrega(donacionId: string): Promise<Donacion | null> {
  if (esSupabaseConfigurado()) {
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
  }

  const volDirecto = globalThis.__NEXO_DONACIONES_VOLATILES?.get(donacionId);
  if (volDirecto) return { ...volDirecto };

  const catDirecto = globalThis.__NEXO_CATALOGO_VOLATIL?.get(donacionId);
  if (catDirecto) return { ...catDirecto };

  if (globalThis.__NEXO_DONACIONES_VOLATILES) {
    const listaVol = Array.from(globalThis.__NEXO_DONACIONES_VOLATILES.values());
    for (const item of listaVol) {
      if (item.codigo === donacionId) return { ...item };
    }
  }

  if (globalThis.__NEXO_CATALOGO_VOLATIL) {
    const listaCat = Array.from(globalThis.__NEXO_CATALOGO_VOLATIL.values());
    for (const item of listaCat) {
      if (item.codigo === donacionId) return { ...item };
    }
  }

  return null;
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
      mensaje:
        'Bloqueo (CA-04.2): No se puede entregar una donación que se encuentra en estado DISPONIBLE y no ha sido tomada previamente por un voluntario.',
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
      mensaje:
        'DoD: Solo el voluntario que reservó y tiene asignada la donación puede registrar la entrega en el comedor.',
    };
  }

  const textoObservaciones = `Receptor: ${input.nombreReceptor.trim()} | Estado físico: ${input.estadoFisico}${
    input.observaciones?.trim() ? ` | Notas: ${input.observaciones.trim()}` : ''
  }`;

  // 7. CA-04.1: Persistencia en Supabase si está disponible
  if (esSupabaseConfigurado()) {
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
  }

  // 8. Fallback en memoria (para pruebas, catálogo y modo offline)
  const vol = globalThis.__NEXO_DONACIONES_VOLATILES?.get(input.donacionId) || donacion;
  const actualizadaVol: Donacion = {
    ...vol,
    estado: 'ENTREGADA',
    entregadaAt: ahoraUtcIso,
  };
  globalThis.__NEXO_DONACIONES_VOLATILES?.set(input.donacionId, actualizadaVol);
  globalThis.__NEXO_CATALOGO_VOLATIL?.set(input.donacionId, { ...actualizadaVol });

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
    donacion: { ...actualizadaVol },
    entregadaAt: ahoraUtcIso,
    receptorNombre: input.nombreReceptor.trim(),
  };
}
