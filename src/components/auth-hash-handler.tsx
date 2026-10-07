"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Compatibilità con i link email in stile "implicit flow"
 * (es. template email predefiniti di Supabase):
 * apre una sessione se nell'URL è presente #access_token=…&refresh_token=…
 * e reindirizza alla pagina corretta.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    if (!accessToken || !refreshToken) return;

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled || error) return;

        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
        router.replace(type === "recovery" ? "/reimposta-password" : "/dashboard");
        router.refresh();
      } catch {
        // Ignora: l'utente potrà accedere manualmente.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
