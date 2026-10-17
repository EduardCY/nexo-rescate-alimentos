import { z } from 'zod';

/**
 * Esquema de validación estricta para la publicación de una donación de alimentos (CMP-01).
 * 
 * Trazabilidad de negocio:
 * - RF-001: Captura de tipo de alimento, cantidad estimada, unidad, dirección y hora límite.
 * - RF-017: Compuerta legal mandatoria de exención de responsabilidad (Ley 1990 de 2019).
 * - CA-01.1: Registro exitoso con todos los campos válidos y exención aceptada.
 * - CA-01.2: Falla si la hora límite es anterior o igual a la actual.
 * - CA-01.3: Falla si no se acepta la exención sanitaria.
 * - CA-01.4: Asignación y control de la etiqueta de refrigeración.
 */
export const DonacionInputSchema = z.object({
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
        const parsed = new Date(val);
        return !isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
      },
      {
        message: 'La hora límite de recogida debe ser una fecha y hora futura válida',
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

export type DonacionInput = z.infer<typeof DonacionInputSchema>;
