"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import { STATUS_OPTIONS } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const initialState: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({
  defaultDisplayName,
  defaultMarketingConsent,
  defaultStatus,
  defaultSchool,
  defaultCity,
}: {
  defaultDisplayName: string;
  defaultMarketingConsent: boolean;
  defaultStatus: string;
  defaultSchool: string;
  defaultCity: string;
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Dati per le statistiche{" "}
          <span className="font-normal text-slate-500">(facoltativi)</span>
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Ci aiutano a capire chi usa Pediatroma e a misurare — solo in forma
          aggregata — come migliorano gli esiti degli studenti. Puoi svuotare
          questi campi quando vuoi.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaultStatus}
              className="block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Preferisco non indicarlo</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="city"
              name="city"
              type="text"
              label="Città"
              placeholder="Es. Roma"
              maxLength={60}
              defaultValue={defaultCity}
            />
            <TextField
              id="school"
              name="school"
              type="text"
              label="Scuola / Università"
              placeholder="Es. Sapienza"
              maxLength={100}
              defaultValue={defaultSchool}
            />
          </div>
        </div>
      </div>

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

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
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
