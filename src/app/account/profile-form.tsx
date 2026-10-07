"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const initialState: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({
  defaultDisplayName,
  defaultMarketingConsent,
}: {
  defaultDisplayName: string;
  defaultMarketingConsent: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <TextField
        id="display_name"
        name="display_name"
        type="text"
        label="Nome visualizzato"
        placeholder="Come vuoi essere chiamato"
        defaultValue={defaultDisplayName}
        maxLength={50}
      />

      <Checkbox
        id="marketing_consent"
        name="marketing_consent"
        defaultChecked={defaultMarketingConsent}
        label="Desidero ricevere comunicazioni informative e aggiornamenti via email (facoltativo, revocabile in ogni momento)."
      />

      {state.status !== "idle" ? (
        <Alert variant={state.status === "success" ? "success" : "error"}>
          {state.message}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner /> Salvataggio…
          </>
        ) : (
          "Salva modifiche"
        )}
      </Button>
    </form>
  );
}
