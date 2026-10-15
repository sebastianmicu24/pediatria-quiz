import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, supabaseEnv } from "@/lib/env";

/** Rotte accessibili solo agli utenti autenticati. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/quiz",
  "/account",
  "/statistiche",
  "/turni",
  "/strumenti",
  "/admin",
  "/reimposta-password",
];

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
    cookieOptions: authCookieOptions(),
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

  // getClaims() legge la sessione (aggiornando il token se è scaduto o
  // sta per scadere) e ne verifica la firma: i cookie aggiornati vengono
  // poi riscritti nella risposta, esattamente come faceva getUser().
  //
  // Con chiavi di firma asimmetriche la verifica avviene in locale con
  // le chiavi pubbliche (JWKS in cache di processo): una navigazione
  // costa un round trip in meno. Se il progetto usa ancora JWT
  // simmetrici (HS256), getClaims() ricade internamente su getUser() e
  // il comportamento resta identico a prima (docs/PERFORMANCE.md § 5.H).
  //
  // "known" distingue "nessuna sessione" da "verifica non disponibile"
  // (rete o JWKS irraggiungibile): nel secondo caso non si applicano i
  // redirect, altrimenti un guasto momentaneo manderebbe al login anche
  // gli utenti connessi. La decisione vera resta nelle pagine.
  let userId: string | null = null;
  let known = true;
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    userId = typeof sub === "string" ? sub : null;
  } catch {
    known = false;
  }

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

  if (known && !userId && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return applyCookies(NextResponse.redirect(url));
  }

  if (known && userId && matchesPrefix(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(NextResponse.next({ request }));
}
