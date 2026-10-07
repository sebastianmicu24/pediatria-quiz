import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";

/**
 * Client Supabase con chiave segreta (bypassa la RLS).
 * Usare SOLO lato server, in codice che verifica già i permessi
 * dell'utente (es. pannello statistiche, eliminazione account).
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  if (!secretKey) {
    throw new Error(
      "Configurazione mancante: imposta SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY)."
    );
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
