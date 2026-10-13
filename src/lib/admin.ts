import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

/**
 * Verifica se un'email appartiene agli amministratori
 * (variabile ADMIN_EMAILS, lista separata da virgole).
 * Lato server soltanto.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}

/**
 * Accesso alle pagine amministrazione: richiede l'utente autenticato e,
 * se non è nell'allowlist ADMIN_EMAILS, risponde 404 (non rivela
 * nemmeno l'esistenza della pagina). Da usare solo lato server.
 */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
