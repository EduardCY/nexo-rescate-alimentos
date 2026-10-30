/**
 * Utilidades para resolución de identificadores y alias hacia UUIDs canónicos de PostgreSQL/Supabase.
 * No incluye directiva 'use server' para permitir la exportación de constantes y funciones síncronas.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SEED_UUID_MAP: Record<string, string> = {
  'seed-01': '00000000-0000-0000-0000-000000000201',
  'DON-201': '00000000-0000-0000-0000-000000000201',
  'seed-02': '00000000-0000-0000-0000-000000000202',
  'DON-202': '00000000-0000-0000-0000-000000000202',
  'seed-03': '00000000-0000-0000-0000-000000000203',
  'DON-203': '00000000-0000-0000-0000-000000000203',
  'seed-04': '00000000-0000-0000-0000-000000000204',
  'DON-204': '00000000-0000-0000-0000-000000000204',
  'seed-05': '00000000-0000-0000-0000-000000000205',
  'DON-205': '00000000-0000-0000-0000-000000000205',
};

export const VOLUNTARIO_CANONICO_UUID = '00000000-0000-0000-0000-000000000002';

export const VOLUNTARIO_UUID_MAP: Record<string, string> = {
  'vol-001': VOLUNTARIO_CANONICO_UUID,
  'vol-002': '00000000-0000-0000-0000-000000000003',
  'vol-003': '00000000-0000-0000-0000-000000000004',
};

/**
 * Resuelve un ID o código de donación a un UUID válido si existe en el mapa de semillas o es UUID.
 */
export function resolverUuidDonacion(donacionId: string): string | null {
  if (!donacionId) return null;
  if (UUID_REGEX.test(donacionId)) return donacionId;
  if (SEED_UUID_MAP[donacionId]) return SEED_UUID_MAP[donacionId];
  return null;
}

/**
 * Resuelve un ID de voluntario a un UUID válido para PostgreSQL si es reconocido o UUID.
 */
export function resolverUuidVoluntario(voluntarioId?: string): string {
  if (!voluntarioId) return VOLUNTARIO_CANONICO_UUID;
  if (UUID_REGEX.test(voluntarioId)) return voluntarioId;
  if (VOLUNTARIO_UUID_MAP[voluntarioId]) return VOLUNTARIO_UUID_MAP[voluntarioId];
  return voluntarioId;
}
