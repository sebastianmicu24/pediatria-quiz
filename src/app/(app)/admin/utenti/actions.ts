"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAG_REGEX = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]{0,39}$/u;
const MAX_TAGS = 10;

/**
 * Aggiorna i tag di un utente (solo amministratori, via service role:
 * la colonna tags non è scrivibile dagli utenti).
 */
async function updateUserTags(
  userId: string,
  mutate: (tags: string[]) => string[]
): Promise<void> {
  await requireAdmin();

  if (!UUID_REGEX.test(userId)) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("tags")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return;

  const current = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const next = mutate(current).slice(0, MAX_TAGS);

  await admin.from("profiles").update({ tags: next }).eq("id", userId);
  refresh();
}

/** Aggiunge un tag a un utente (deduplicato, senza distinzione maiuscole). */
export async function addUserTag(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "").trim();
  const tag = String(formData.get("tag") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!TAG_REGEX.test(tag)) return;

  await updateUserTags(userId, (current) => {
    const exists = current.some(
      (item) => item.toLowerCase() === tag.toLowerCase()
    );
    return exists ? current : [...current, tag];
  });
}

/** Rimuove un tag da un utente (senza distinzione di maiuscole). */
export async function removeUserTag(formData: FormData): Promise<void> {
  const userId = String(formData.get("user_id") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) return;

  await updateUserTags(userId, (current) =>
    current.filter((item) => item.toLowerCase() !== tag.toLowerCase())
  );
}

/**
 * Conferma manualmente l'email di un utente (supporto): utile quando
 * non riesce a ricevere l'email di conferma e contatta l'assistenza.
 * Dopo la conferma l'utente può accedere senza cliccare il link.
 */
export async function confirmUserEmail(formData: FormData): Promise<void> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!UUID_REGEX.test(userId)) return;

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  refresh();
}
