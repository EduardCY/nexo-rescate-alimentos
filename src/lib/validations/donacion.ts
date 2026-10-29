import { z } from 'zod';

/**
 * Función auxiliar para parsear y normalizar la hora límite tanto en formato
 * de hora local simple (HH:mm, ej. 16:00) como en formato ISO completo (YYYY-MM-DDTHH:mm:ssZ).
 */
function parseHoraLimite(val: string): Date | null {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const match = val.match(timeRegex);
  if (match) {
    const now = new Date();
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Esquema de validación estricta para la publicación de una donación de alimentos (CMP-01).
 * Satisface los contratos de prueba unitaria y de gobierno (Habeas Data Ley 1581) de QA.
 *
 * Trazabilidad de negocio:
 * - RF-001: Captura de tipo de alimento, cantidad estimada, unidad, dirección y hora límite.
 * - RF-017: Compuerta legal mandatoria de exención de responsabilidad (Ley 1990 de 2019).
 * - RNF-003: Cero captura de datos sensibles o personales de beneficiarios finales.
 * - CA-01.1: Registro exitoso con todos los campos válidos y exención aceptada.
 * - CA-01.2: Falla si la hora límite es anterior o igual a la actual.
 * - CA-01.3: Falla si no se acepta la exención sanitaria.
 * - CA-01.4: Asignación y control de la etiqueta de refrigeración.
 */
export const donacionSchema = z.object({
  tipoAlimento: z
    .string()
    .min(3, 'El tipo de alimento debe tener al menos 3 caracteres'),
  cantidadEstimada: z
    .number()
    .positive('La cantidad estimada debe ser mayor a 0'),
  unidadMedida: z.enum(['kg', 'canastillas', 'bultos', 'unidades']),
  direccionRecogida: z
    .string()
    .min(5, 'La dirección de recogida debe tener al menos 5 caracteres'),
  horaLimite: z
    .string()
    .refine(
      (val) => {
        const parsed = parseHoraLimite(val);
        return parsed !== null && parsed.getTime() > Date.now();
      },
      {
        message: 'La hora límite de recogida debe ser una fecha y hora futura válida (posterior a la actual)',
      }
    ),
  requiereFrio: z.boolean().default(false),
  exencionSanitariaAceptada: z.literal(
    true,
    'Debes aceptar la exención de responsabilidad sanitaria (Ley 1990 de 2019) para continuar'
  ),
  donanteId: z.string().optional(),
  donanteNombre: z.string().optional(),
});

/**
 * Alias exportado para compatibilidad con la Server Action y componentes.
 */
export const DonacionInputSchema = donacionSchema;

export type DonacionInput = z.infer<typeof donacionSchema>;
