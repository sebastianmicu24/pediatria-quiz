import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
};

/**
 * Legge l'utente corrente. Deduplicato per richiesta tramite React cache().
 * Restituisce null se non autenticato o se Supabase non è configurato.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      displayName:
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null,
      createdAt: user.created_at ?? null,
    };
  } catch {
    return null;
  }
});

/**
 * Come getCurrentUser, ma reindirizza al login se l'utente non è autenticato.
 * Da usare nelle pagine protette e nelle Server Action.
 */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"
    );
  }
  return user;
}
