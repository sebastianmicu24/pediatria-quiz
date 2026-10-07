"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isProfileStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser("/account");

  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 50);
  const marketingConsent = formData.get("marketing_consent") === "on";
  const rawStatus = String(formData.get("status") ?? "").trim();
  const status = isProfileStatus(rawStatus) ? rawStatus : null;
  const school = String(formData.get("school") ?? "").trim().slice(0, 100);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      marketing_consent: marketingConsent,
      status,
      school: school || null,
      city: city || null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Non è stato possibile salvare le modifiche. Riprova.",
    };
  }

  // Allinea anche i metadati di autenticazione (usati dalla navbar).
  await supabase.auth.updateUser({
    data: { display_name: displayName || null },
  });

  refresh();

  return { status: "success", message: "Profilo aggiornato correttamente." };
}
