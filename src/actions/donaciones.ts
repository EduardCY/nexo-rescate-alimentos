'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient } from '@/lib/supabase/server';
import type { Donacion, ZonaCali } from '@/types';
import { normalizarFechaHoraLimite, inferirZonaCali } from '@/lib/utils/donaciones-helper';

export type PublicarDonacionResultado =
  | { exito: true; codigo: string }
  | { exito: false; error: string };

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

/** Donaciones semilla para el catálogo en Cali cuando Supabase está en modo desarrollo/sin semillas */
const DONACIONES_SEMILLA_CALI: Donacion[] = [
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
    horaLimite: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 horas (urgente)
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
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
    horaLimite: new Date(Date.now() + 180 * 60 * 1000).toISOString(), // 3 horas
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
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
    horaLimite: new Date(Date.now() + 300 * 60 * 1000).toISOString(), // 5 horas
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
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
    horaLimite: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // 1 hora y 15 min (muy urgente)
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
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
    horaLimite: new Date(Date.now() + 240 * 60 * 1000).toISOString(), // 4 horas
    estado: 'DISPONIBLE',
    exencionSanitariaAceptada: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Obtiene el catálogo reactivo de donaciones disponibles (CA-02.1, CA-02.3, CA-02.4).
 * Filtra solo estado DISPONIBLE y horaLimite > ahora.
 */
export async function obtenerDonacionesDisponibles(zona?: ZonaCali | 'TODAS'): Promise<Donacion[]> {
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
    // Fallback si Supabase no está conectado
  }

  // Fallback con filtro en memoria garantizando CA-02.1 y CA-02.4
  const ahora = Date.now();
  return DONACIONES_SEMILLA_CALI.filter((d) => {
    const esDisponible = d.estado === 'DISPONIBLE';
    const esVigente = new Date(d.horaLimite).getTime() > ahora;
    const coincideZona = !zona || zona === 'TODAS' || d.zona === zona;
    return esDisponible && esVigente && coincideZona;
  }).sort((a, b) => new Date(a.horaLimite).getTime() - new Date(b.horaLimite).getTime());
}