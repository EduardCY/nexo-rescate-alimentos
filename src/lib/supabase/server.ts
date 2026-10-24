import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para operaciones del servidor (Server Actions / API Handlers).
 * Permite ejecutar mutaciones y consultas seguras en la base de datos de PostgreSQL
 * utilizando las variables de entorno de Supabase.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'mock-key';

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getSupabaseServerClient = createClient;
