"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    if (password.length < 8) {
      setFieldError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setFieldError("Le due password non coincidono.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(authErrorMessage(updateError.message));
        setPending(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Errore di rete: verifica la connessione e riprova.");
      setPending(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          id="password"
          name="password"
          type="password"
          label="Nuova password"
          autoComplete="new-password"
          required
          placeholder="Almeno 8 caratteri"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError}
        />

        <TextField
          id="confirm-password"
          name="confirm_password"
          type="password"
          label="Conferma nuova password"
          autoComplete="new-password"
          required
          placeholder="Ripeti la password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner /> Aggiornamento…
            </>
          ) : (
            "Salva nuova password"
          )}
        </Button>
      </form>
    </div>
  );
}
