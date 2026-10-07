"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ChangePasswordCard({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChangePassword() {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/reimposta-password`,
        }
      );
      if (resetError) {
        setError(authErrorMessage(resetError.message));
      } else {
        setMessage(
          `Ti abbiamo inviato un'email a ${email} con il link per cambiare password.`
        );
      }
    } catch {
      setError("Errore di rete: verifica la connessione e riprova.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button
        variant="secondary"
        onClick={handleChangePassword}
        disabled={pending || !email}
      >
        {pending ? (
          <>
            <Spinner /> Invio in corso…
          </>
        ) : (
          "Invia email per cambiare password"
        )}
      </Button>
    </div>
  );
}

export function DeleteAccountCard() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmText !== "ELIMINA") return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          body?.error ??
            "Non è stato possibile eliminare l'account. Riprova o contattaci."
        );
        setPending(false);
        return;
      }

      // Pulizia lato browser della sessione, poi ritorno alla home.
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignora: i cookie sono già stati invalidati dal server.
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Errore di rete: verifica la connessione e riprova.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <TextField
        id="confirm-delete"
        label='Per confermare scrivi "ELIMINA"'
        placeholder="ELIMINA"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoComplete="off"
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={confirmText !== "ELIMINA" || pending}
      >
        {pending ? (
          <>
            <Spinner /> Eliminazione in corso…
          </>
        ) : (
          "Elimina definitivamente il mio account"
        )}
      </Button>
    </div>
  );
}
