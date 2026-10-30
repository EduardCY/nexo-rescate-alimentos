import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica si las variables de entorno apuntan a una instancia real de Supabase
 * y no a valores simulados (mock/dummy) de desarrollo local o pruebas unitarias.
 */
export function esSupabaseConfigurado(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!url || !key) return false;
  if (
    url.includes('mock.supabase.co') ||
    url.includes('dummy.supabase.co') ||
    key === 'mock-key'
  ) {
    return false;
  }
  return true;
}

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
