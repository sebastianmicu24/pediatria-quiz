import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { LEGAL } from "@/lib/legal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  BarChart3,
  Download,
  KeyRound,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { ProfileForm } from "./profile-form";
import { ChangePasswordCard, DeleteAccountCard } from "./danger-zone";

export async function AccountContent() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, marketing_consent, accepted_terms_at, status, school, city")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = isAdminEmail(user.email);

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Account
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Gestisci il tuo profilo, i tuoi dati e la sicurezza dell&apos;account.
        </p>
      </header>

      {/* Profilo */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Profilo</h2>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 truncate text-sm text-slate-900">
              {user.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">
              Termini accettati il
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {profile?.accepted_terms_at
                ? formatDate(profile.accepted_terms_at)
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <ProfileForm
            defaultDisplayName={profile?.display_name ?? user.displayName ?? ""}
            defaultMarketingConsent={profile?.marketing_consent ?? false}
            defaultStatus={profile?.status ?? ""}
            defaultSchool={profile?.school ?? ""}
            defaultCity={profile?.city ?? ""}
          />
        </div>
      </section>

      {/* Sicurezza */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Sicurezza</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Per cambiare password ti invieremo un&apos;email con un link sicuro.
          La nuova password deve contenere almeno 8 caratteri.
        </p>
        <div className="mt-5">
          <ChangePasswordCard email={user.email ?? ""} />
        </div>
      </section>

      {/* I tuoi dati */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">
            I tuoi dati (GDPR)
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Puoi scaricare in ogni momento una copia completa dei tuoi dati
          (profilo, quiz completati e risposte) in formato JSON, come previsto
          dal diritto alla portabilità (art. 20 GDPR). Per qualsiasi richiesta
          puoi scrivere a{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            {LEGAL.email}
          </a>
          .
        </p>
        <a
          href="/api/account/export"
          download
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Scarica i tuoi dati (JSON)
        </a>
      </section>

      {/* Statistiche aggregate (solo amministratori) */}
      {isAdmin ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">
              Statistiche aggregate
            </h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Pannello riservato agli amministratori: esiti degli studenti,
            distribuzione per status, città e scuola, sempre in forma
            aggregata e anonima.
          </p>
          <Link
            href="/statistiche"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 sm:w-auto"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Apri il pannello statistiche
          </Link>
        </section>
      ) : null}

      {/* Zona di pericolo */}
      <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-rose-900">
            Elimina account
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-rose-900/80">
          L&apos;eliminazione è immediata e definitiva: verranno cancellati
          account, profilo, statistiche e risposte. Vedi la{" "}
          <a
            href="/privacy"
            className="font-medium underline underline-offset-2"
          >
            Privacy Policy
          </a>{" "}
          per i dettagli.
        </p>
        <div className="mt-5">
          <DeleteAccountCard />
        </div>
      </section>
    </>
  );
}
