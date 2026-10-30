'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient, esSupabaseConfigurado } from '@/lib/supabase/server';
import type { Donacion, ZonaCali } from '@/types';
import { normalizarFechaHoraLimite, inferirZonaCali } from '@/lib/utils/donaciones-helper';

export type PublicarDonacionResultado =
  | { exito: true; codigo: string }
  | { exito: false; error: string };

export type TomarDonacionResultado =
  | { exito: true; codigo: 200; mensaje: string; donacion: Donacion }
  | { exito: false; codigo: 409; mensaje: string; donacionId: string }
  | { exito: false; codigo: 410; mensaje: string; donacionId: string }
  | { exito: false; codigo: 500; mensaje: string; donacionId: string };

/** Estado en memoria para desarrollo local, pruebas y fallback offline de concurrencia */
const DONACIONES_ESTADO_VOLATIL: Map<string, Donacion> = new Map([
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
      zona: 'LADERA',
      horaLimite: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
      estado: 'DISPONIBLE',
      exencionSanitariaAceptada: true,
      createdAt: new Date().toISOString(),
    },
  ],
]);

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

  return {
    exito: true,
    codigo: donacion?.codigo || `DON-${Date.now().toString().slice(-4)}`,
  };
}

/**
 * Obtiene el catálogo reactivo de donaciones disponibles (CA-02.1, CA-02.3, CA-02.4).
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
        return data.map((d) => ({
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
      }
    } catch {
      // Fallback a memoria si Supabase no está conectado
    }
  }

  const ahora = Date.now();
  const lista: Donacion[] = Array.from(DONACIONES_ESTADO_VOLATIL.values());
  return lista
    .filter((d) => {
      const esDisponible = d.estado === 'DISPONIBLE';
      const esVigente = new Date(d.horaLimite).getTime() > ahora;
      const coincideZona = !zona || zona === 'TODAS' || d.zona === zona;
      return esDisponible && esVigente && coincideZona;
    })
    .sort((a, b) => new Date(a.horaLimite).getTime() - new Date(b.horaLimite).getTime());
}

/**
 * Server Action para tomar/reservar una donación con control atómico de concurrencia (TASK-09 / CMP-03).
 * Satisface CA-03.2 (colisión HTTP 409 con mensaje empático) y CA-03.3 (bloqueo sobre expiradas/canceladas).
 * Conecta directamente con la función RPC `tomar_donacion` (TASK-08 / PR #24).
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
            zona: inferirZonaCali(rpcData.direccion_recogida || ''),
            horaLimite: ahoraIso,
            estado: 'ASIGNADA',
            exencionSanitariaAceptada: true,
            createdAt: ahoraIso,
            voluntarioId: rpcData.voluntario_id || voluntarioId,
            voluntarioNombre: rpcData.voluntario_nombre || voluntarioNombre,
            asignadaAt: rpcData.asignada_at || ahoraIso,
          };

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
      const { data: donacionActual } = await supabase
        .from('donaciones')
        .select('*')
        .eq('id', donacionId)
        .single();

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
          .eq('id', donacionId)
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

        return {
          exito: true,
          codigo: 200,
          mensaje: 'Donación reservada exitosamente',
          donacion: {
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
          },
        };
      }
    } catch {
      // Manejo de fallback para desarrollo/offline
    }
  }

  // Fallback atómico en memoria para pruebas de concurrencia y modo offline
  const item = DONACIONES_ESTADO_VOLATIL.get(donacionId);
  if (!item) {
    return {
      exito: false,
      codigo: 410,
      mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
      donacionId,
    };
  }

  if (new Date(item.horaLimite).getTime() <= ahoraMs || item.estado === 'EXPIRADA') {
    return {
      exito: false,
      codigo: 410,
      mensaje: 'Esta oferta ha expirado y ya no se encuentra disponible para recogida.',
      donacionId,
    };
  }

  if (item.estado !== 'DISPONIBLE') {
    return {
      exito: false,
      codigo: 409,
      mensaje:
        'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.',
      donacionId,
    };
  }

  // Toma atómica exitosa
  item.estado = 'ASIGNADA';
  item.voluntarioId = voluntarioId;
  item.voluntarioNombre = voluntarioNombre;
  item.asignadaAt = ahoraIso;
  DONACIONES_ESTADO_VOLATIL.set(donacionId, item);

  return {
    exito: true,
    codigo: 200,
    mensaje: 'Donación reservada exitosamente',
    donacion: { ...item },
  };
}
