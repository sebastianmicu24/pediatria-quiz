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
