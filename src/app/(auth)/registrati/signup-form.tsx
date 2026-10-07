"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { STATUS_OPTIONS } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function SignupForm() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [fieldError, setFieldError] = useState<{
    password?: string;
    terms?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const errors: typeof fieldError = {};
    if (password.length < 8) {
      errors.password = "La password deve contenere almeno 8 caratteri.";
    }
    if (!acceptTerms) {
      errors.terms = "Per registrarti devi accettare i Termini e la Privacy Policy.";
    }
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || null,
            accepted_terms: true,
            marketing_consent: marketingConsent,
            status: status || null,
            school: school.trim().slice(0, 100) || null,
            city: city.trim().slice(0, 60) || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
        },
      });

      if (signUpError) {
        setError(authErrorMessage(signUpError.message));
        setPending(false);
        return;
      }

      // Con la conferma email attiva, Supabase non rivela se l'email esiste già:
      // in quel caso restituisce un utente "fittizio" senza identities.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError(
          "Esiste già un account con questa email. Prova ad accedere oppure reimposta la password."
        );
        setPending(false);
        return;
      }

      if (data.session) {
        // Conferma email disattivata nel progetto Supabase: accesso immediato.
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setEmailSent(true);
    } catch {
      setError("Errore di rete: verifica la connessione e riprova.");
      setPending(false);
    }
  }

  if (emailSent) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Controlla la tua email
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Abbiamo inviato un link di conferma a{" "}
          <strong className="text-slate-900">{email.trim()}</strong>. Apri
          l&apos;email e clicca sul link per attivare l&apos;account (controlla
          anche la cartella spam).
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Non hai ricevuto nulla? Attendi qualche minuto e riprova la
          registrazione, oppure dalla pagina di accesso potrai richiedere il
          reinvio dell&apos;email.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          id="display-name"
          name="display_name"
          type="text"
          label="Nome visualizzato (facoltativo)"
          autoComplete="name"
          placeholder="Come vuoi essere chiamato"
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder="nome@esempio.it"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          placeholder="Almeno 8 caratteri"
          hint="Usa almeno 8 caratteri, meglio se con lettere, numeri e simboli."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError.password}
        />

        {/* Dati facoltativi per le statistiche aggregate */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Raccontaci di te{" "}
            <span className="font-normal text-slate-500">(facoltativo)</span>
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Ci aiuti a misurare — solo in forma aggregata — gli esiti degli
            studenti. Puoi modificare o rimuovere questi dati quando vuoi dal
            tuo account.
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
                value={status}
                onChange={(e) => setStatus(e.target.value)}
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
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <TextField
                id="school"
                name="school"
                type="text"
                label="Scuola / Università"
                placeholder="Es. Sapienza"
                maxLength={100}
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Checkbox
            id="accept-terms"
            name="accept_terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            error={fieldError.terms}
            label={
              <>
                Ho letto e accetto i{" "}
                <Link
                  href="/termini"
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-brand-700 underline underline-offset-2"
                >
                  Termini di servizio
                </Link>{" "}
                e la{" "}
                <Link
                  href="/privacy"
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-brand-700 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                . *
              </>
            }
          />

          <Checkbox
            id="marketing-consent"
            name="marketing_consent"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            label="Desidero ricevere comunicazioni informative e aggiornamenti via email (facoltativo, puoi revocare quando vuoi)."
          />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner /> Creazione account…
            </>
          ) : (
            "Crea account gratuito"
          )}
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Registrandoti dichiari di avere almeno 14 anni. I tuoi dati sono
          trattati secondo la Privacy Policy e puoi cancellare l&apos;account in
          ogni momento.
        </p>
      </form>
    </div>
  );
}
