import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/lib/env";

/**
 * Client Supabase lato server (Server Component, Server Action, Route Handler).
 * La sessione viaggia nei cookie gestiti da @supabase/ssr.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Nei Server Component la scrittura dei cookie non è consentita:
          // l'aggiornamento dei token avviene nel proxy (src/proxy.ts).
        }
      },
    },
  });
}
