"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions, requireSupabaseEnv } from "@/lib/env";

/**
 * Client Supabase per i Client Component (browser).
 * Crea una nuova istanza a ogni chiamata: va bene, il client è leggero.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    cookieOptions: authCookieOptions(),
  });
}
