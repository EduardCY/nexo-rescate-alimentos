'use server';

import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { createClient } from '@/lib/supabase/server';

export type PublicarDonacionResultado = 
  | { exito: true; codigo: string }
  | { exito: false; error: string };

/**
 * Publica una oferta de donación de alimentos en la plataforma (CMP-01).
 * 
 * Trazabilidad de negocio:
 * - RF-001: Registro de donación con tipo de alimento, cantidad estimada, dirección y hora límite.
 * - RF-017: Aceptación obligatoria de la exención de responsabilidad sanitaria (Ley 1990 de 2019).
 * - RNF-001: Operación liviana pensada para dispositivos móviles (Mobile-First).
 * - RNF-004: Persistencia íntegra y trazable en la tabla relacional donaciones.
 * 
 * Criterios de Aceptación satisfechos:
 * - CA-01.1: Registro exitoso con estado DISPONIBLE y código único.
 * - CA-01.2: Rechazo si la hora límite no es futura.
 * - CA-01.3: Rechazo si no se acepta la exención sanitaria legal.
 * - CA-01.4: Asignación de la bandera de requerimiento de refrigeración (equiere_frio).
 * 
 * @param input Datos del formulario de donación tipados según DonacionInputSchema.
 * @returns Promesa con el resultado de la publicación { exito: true, codigo } o { exito: false, error }.
 */
export async function publicarDonacion(input: DonacionInput): Promise<PublicarDonacionResultado> {
  const parseResult = DonacionInputSchema.safeParse(input);

  if (!parseResult.success) {
    const issues = parseResult.error.issues || (parseResult.error as unknown as { errors?: Array<{ message: string }> }).errors || [];
    const errorMensaje = issues.map((e) => e.message).join('. ') || parseResult.error.message;
    return {
      exito: false,
      error: errorMensaje,
    };
  }

  const data = parseResult.data;
  const supabase = createClient();

  const payload = {
    tipo_alimento: data.tipoAlimento,
    cantidad_estimada: data.cantidadEstimada,
    unidad_medida: data.unidadMedida,
    direccion_recogida: data.direccionRecogida,
    hora_limite: new Date(data.horaLimite).toISOString(),
    requiere_frio: data.requiereFrio,
    exencion_sanitaria_aceptada: data.exencionSanitariaAceptada,
    estado: 'DISPONIBLE',
    donante_id: data.donanteId || '00000000-0000-0000-0000-000000000001',
    donante_nombre: data.donanteNombre || 'Comercio Donante',
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
    codigo: donacion?.codigo || 'DON-101',
  };
}
