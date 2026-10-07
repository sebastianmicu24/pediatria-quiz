import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/** Rotte accessibili solo agli utenti autenticati. */
const PROTECTED_PREFIXES = ["/dashboard", "/quiz", "/account", "/reimposta-password"];

/** Rotte di autenticazione: un utente già connesso viene rimandato alla dashboard. */
const AUTH_PAGES = ["/login", "/registrati", "/password-dimenticata"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Aggiorna la sessione Supabase e applica i redirect di base.
 * Il controllo "vero" dell'autorizzazione avviene nelle pagine/azioni server.
 */
export async function updateSession(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) {
    // Supabase non ancora configurato: il sito resta visitabile
    // (le pagine che richiedono l'accesso mostreranno l'errore).
    return NextResponse.next({ request });
  }

  let pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  let pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        pendingCookies = cookiesToSet;
        pendingHeaders = headers ?? {};
      },
    },
  });

  // Importante: chiamare getUser() all'inizio per aggiornare i token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyCookies = <T extends NextResponse>(response: T): T => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    Object.entries(pendingHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };

  const { pathname, search } = request.nextUrl;

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return applyCookies(NextResponse.redirect(url));
  }

  if (user && matchesPrefix(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(NextResponse.next({ request }));
}
