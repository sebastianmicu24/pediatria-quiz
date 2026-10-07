import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/env";

/**
 * Eliminazione definitiva dell'account (diritto all'oblio — art. 17 GDPR).
 * Richiede la chiave SUPABASE_SERVICE_ROLE_KEY (solo lato server).
 * La cancellazione dell'utente rimuove a cascata profilo, tentativi e risposte.
 */
export async function POST(request: NextRequest) {
  // Protezione CSRF di base: accetta solo richieste same-origin.
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set([new URL(siteUrl()).origin, new URL(request.url).origin]);
    if (!allowed.has(origin)) {
      return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
    }
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Configurazione incompleta: manca SUPABASE_SERVICE_ROLE_KEY. Contatta l'assistenza.",
      },
      { status: 500 }
    );
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] Errore Supabase:", error.message);
    return NextResponse.json(
      {
        error:
          "Non è stato possibile eliminare l'account in questo momento. Riprova più tardi.",
      },
      { status: 500 }
    );
  }

  // Invalida i cookie di sessione (base e frammenti) nella risposta.
  const response = NextResponse.json({ ok: true });
  request.cookies.getAll().forEach(({ name }) => {
    if (/^sb-.*-auth-token/.test(name)) {
      response.cookies.delete(name);
    }
  });
  return response;
}
