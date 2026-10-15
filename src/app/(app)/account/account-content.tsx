import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";
import { LEGAL } from "@/lib/legal";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ProfileForm } from "./profile-form";
import { ChangePasswordCard, DeleteAccountCard } from "./danger-zone";

type AccountProfile = {
  display_name: string | null;
  marketing_consent: boolean;
  accepted_terms_at: string | null;
  status: string | null;
  school: string | null;
  city: string | null;
  year?: string | null;
  tags?: string[] | null;
};

/** Sezione di impostazioni: titolo e spiegazione a sinistra, contenuto a destra. */
function SettingsSection({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-neutral-200 py-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <div>
        <h2
          className={
            danger
              ? "text-base font-semibold text-red-800"
              : "text-base font-semibold text-neutral-900"
          }
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}

export async function AccountContent() {
  const user = await requireUser("/account");
  const supabase = await createClient();

  // Se la migrazione di anno/tag non è ancora applicata al database,
  // carica il profilo senza le colonne nuove (degradazione con grazia).
  const fullProfile = await supabase
    .from("profiles")
    .select(
      "display_name, marketing_consent, accepted_terms_at, status, school, city, year, tags"
    )
    .eq("id", user.id)
    .maybeSingle();
  let profile = fullProfile.data as AccountProfile | null;
  if (fullProfile.error && isMissingColumnError(fullProfile.error.message)) {
    const legacyProfile = await supabase
      .from("profiles")
      .select(
        "display_name, marketing_consent, accepted_terms_at, status, school, city"
      )
      .eq("id", user.id)
      .maybeSingle();
    profile = legacyProfile.data as AccountProfile | null;
  }

  return (
    <PageContainer width="default">
      <PageHeader
        title="Account"
        description="Profilo, sicurezza e gestione dei tuoi dati."
      />

      <div className="mt-8">
        <SettingsSection
          title="Profilo"
          description="Il nome compare nel saluto della dashboard. I dati facoltativi servono solo a statistiche aggregate."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-neutral-500">Email</dt>
              <dd className="mt-1 truncate text-sm text-neutral-900">
                {user.email ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500">
                Termini accettati il
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">
                {profile?.accepted_terms_at
                  ? formatDate(profile.accepted_terms_at)
                  : "—"}
              </dd>
            </div>
          </dl>

          {Array.isArray(profile?.tags) && profile.tags.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-medium text-neutral-500">
                Tag assegnati dal team
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.tags.map((tag: string) => (
                  <li key={tag}>
                    <Badge tone="brand">{tag}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 border-t border-neutral-100 pt-6">
            <ProfileForm
              defaultDisplayName={profile?.display_name ?? user.displayName ?? ""}
              defaultMarketingConsent={profile?.marketing_consent ?? false}
              defaultStatus={profile?.status ?? ""}
              defaultYear={profile?.year ?? ""}
              defaultSchool={profile?.school ?? ""}
              defaultCity={profile?.city ?? ""}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Sicurezza"
          description="Per cambiare password ti invieremo un'email con un link sicuro. La nuova password deve contenere almeno 8 caratteri."
        >
          <ChangePasswordCard email={user.email ?? ""} />
        </SettingsSection>

        <SettingsSection
          title="I tuoi dati"
          description="Portabilità dei dati (art. 20 GDPR)."
        >
          <p className="text-sm leading-relaxed text-neutral-600">
            Puoi scaricare in ogni momento una copia completa dei tuoi dati
            (profilo, esercitazioni e risposte) in formato JSON. Per qualsiasi
            richiesta scrivi a{" "}
            <a
              href={`mailto:${LEGAL.email}`}
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              {LEGAL.email}
            </a>
            .
          </p>
          {/* Download di un file: un link normale, non una navigazione client. */}
          <a
            href="/api/account/export"
            download
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            Scarica i tuoi dati (JSON)
          </a>
        </SettingsSection>

        <SettingsSection
          title="Elimina account"
          danger
          description={
            <>
              L&apos;eliminazione è immediata e definitiva. Vedi la{" "}
              <a
                href="/privacy"
                className="font-medium underline underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </>
          }
        >
          <p className="mb-4 text-sm leading-relaxed text-neutral-600">
            Verranno cancellati account, profilo, statistiche e risposte.
          </p>
          <DeleteAccountCard />
        </SettingsSection>
      </div>
    </PageContainer>
  );
}
