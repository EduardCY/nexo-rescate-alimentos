import { z } from 'zod';

export const estadoFisicoEnum = z.enum(['EXCELENTE', 'BUENO', 'REGULAR']);
export type EstadoFisicoAlimento = z.infer<typeof estadoFisicoEnum>;

/**
 * Esquema de validación para el acta de confirmación de entrega física en comedor (CMP-04 / TASK-11).
 * Satisface los criterios CA-04.1 y CA-04.2.
 */
export const EntregaInputSchema = z.object({
  donacionId: z.string().min(1, 'El identificador de la donación es obligatorio'),
  nombreReceptor: z
    .string()
    .min(3, 'El nombre de quien recibe debe tener al menos 3 caracteres'),
  estadoFisico: estadoFisicoEnum.default('BUENO'),
  observaciones: z.string().optional(),
  voluntarioId: z.string().optional(),
  voluntarioNombre: z.string().optional(),
});

export type EntregaInput = z.infer<typeof EntregaInputSchema>;