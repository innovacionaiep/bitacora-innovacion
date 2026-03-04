import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase solo para uso en el navegador (Realtime).
 * Las escrituras del chat se hacen con Prisma vía Server Actions.
 *
 * Requiere en .env:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * Para tiempo real del chat de soporte, en el dashboard de Supabase
 * habilitar Realtime para la tabla support_messages (Database > Replication).
 */
let browserClient: SupabaseClient | null | undefined = undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (browserClient !== undefined) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }
  browserClient = createClient(url, anonKey);
  return browserClient;
}
