"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const linkError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Inserisci email e password.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(authErrorMessage(signInError.message));
        setPending(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Errore di rete: verifica la connessione e riprova.");
      setPending(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {linkError === "link-non-valido" ? (
        <Alert variant="error" className="mb-5">
          Il link che hai usato non è valido o è scaduto. Accedi con le tue
          credenziali oppure richiedi una nuova email.
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          placeholder="nome@esempio.it"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="space-y-1.5">
          <TextField
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
            placeholder="La tua password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="text-right">
            <Link
              href="/password-dimenticata"
              className="text-xs font-medium text-brand-700 underline underline-offset-2"
            >
              Password dimenticata?
            </Link>
          </div>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner /> Accesso in corso…
            </>
          ) : (
            "Accedi"
          )}
        </Button>
      </form>
    </div>
  );
}
