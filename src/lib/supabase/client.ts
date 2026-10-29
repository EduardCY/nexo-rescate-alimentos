import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Crea o retorna una instancia del cliente Supabase para el navegador (Client Components).
 * Permite ejecutar consultas y suscripciones en tiempo real desde el cliente.
 * 
 * ¿Por qué?: En Next.js App Router, los componentes de interfaz que se ejecutan en el
 * navegador requieren credenciales públicas (ANON_KEY) y configuración de persistencia
 * de sesión local, a diferencia del cliente de servidor que usa SERVICE_ROLE_KEY.
 * 
 * @returns Instancia configurada de SupabaseClient para Client Components.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const getSupabaseBrowserClient = createClient;
