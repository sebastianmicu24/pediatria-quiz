import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { loadUserStats, type UserStats } from "@/lib/user-stats";
import { APP_NAV } from "@/lib/navigation";
import { formatNumber } from "@/lib/constants";
import { formatPercent, relativeTime } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader, SectionTitle } from "@/components/ui/panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { AttemptList } from "@/components/attempt-list";
import { QuizSetup } from "./quiz-setup";

function greetingFor(now: number): string {
  const hour = Number(
    new Intl.DateTimeFormat("it-IT", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Rome",
    }).format(new Date(now))
  );
  if (hour >= 5 && hour < 13) return "Buongiorno";
  if (hour >= 13 && hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/**
 * Percentuale dei quiz svolti sul totale disponibile. Con oltre 12.000 quiz in
 * archivio la percentuale intera resta a 0% per molto tempo: sotto l'1%
 * mostriamo un decimale, così il progresso rimane leggibile.
 */
function donePercentage(done: number, available: number): string {
  if (available <= 0) return "0%";
  const percent = (done / available) * 100;
  if (percent > 0 && percent < 1) {
    // Troncamento (non arrotondamento): sotto l'1% non vogliamo leggere 1%.
    const truncated = Math.floor(percent * 10) / 10;
    return `${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 1,
    }).format(truncated)}%`;
  }
  return formatPercent(done, available);
}

function ReviewShortcut({
  href,
  title,
  detail,
  disabled,
}: {
  href: string;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-900">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-500">{detail}</span>
      </span>
      {disabled ? null : (
        <ArrowRight
          className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
          aria-hidden="true"
        />
      )}
    </>
  );

  return disabled ? (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 opacity-60">
      {body}
    </div>
  ) : (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50"
    >
      {body}
    </Link>
  );
}

export async function DashboardContent() {
  const user = await requireUser("/dashboard");
  const supabase = await createClient();

  const [profileResult, stats] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    loadUserStats(supabase, user.id),
  ]);

  // Pagina renderizzata a request time (dopo la lettura dei cookie):
  // leggere l'orologio qui è sicuro.
  // eslint-disable-next-line react-hooks/purity -- request-time, non prerender
  const now = Date.now();

  const fullName =
    profileResult.data?.display_name ??
    user.displayName ??
    user.email?.split("@")[0] ??
    "";
  const firstName = fullName.trim().split(/\s+/)[0];

  return <DashboardView firstName={firstName} stats={stats} now={now} />;
}

export function DashboardView({
  firstName,
  stats,
  now,
}: {
  firstName: string;
  stats: UserStats;
  now: number;
}) {
  const { totals, attempts, bestTopic, worstTopic } = stats;
  const wrongCount = totals.uniqueDone - totals.uniqueCorrect;
  const newCount = Math.max(0, totals.available - totals.uniqueDone);
  const lastAttempt = attempts[0];
  const upcoming = APP_NAV.filter((item) => item.status === "soon");

  return (
    <PageContainer width="wide">
      <PageHeader
        title={firstName ? `${greetingFor(now)}, ${firstName}` : greetingFor(now)}
        description={
          totals.attempts === 0
            ? "Inizia dalla tua prima esercitazione: scegli gli argomenti qui sotto."
            : "Riprendi da dove avevi lasciato o ripassa le domande sbagliate."
        }
      />

      {stats.hasError ? (
        <Alert variant="error" className="mt-6">
          <strong>Database non inizializzato.</strong> Sembra che lo schema non
          sia stato ancora applicato al progetto Supabase: esegui{" "}
          <code className="rounded bg-white/60 px-1">supabase/schema.sql</code>{" "}
          nell&apos;SQL Editor e ricarica la pagina.
        </Alert>
      ) : null}

      <StatStrip
        className="mt-8"
        items={[
          {
            label: "Quiz svolti",
            value: donePercentage(totals.uniqueDone, totals.available),
            hint: `${formatNumber(totals.uniqueDone)} su ${formatNumber(totals.available)} quiz`,
          },
          {
            label: "Precisione",
            value: formatPercent(totals.correct, totals.answered),
            hint: `${formatNumber(totals.correct)} risposte corrette`,
          },
          {
            label: "Best & Worst",
            variant: "text",
            value: bestTopic
              ? `Migliore: ${bestTopic.topic} (${formatPercent(bestTopic.correct, bestTopic.total)})`
              : "—",
            detail: worstTopic
              ? `Peggiore: ${worstTopic.topic} (${formatPercent(worstTopic.correct, worstTopic.total)})`
              : undefined,
          },
          {
            label: "Ultimo Quiz",
            value: lastAttempt
              ? relativeTime(lastAttempt.completed_at, now)
              : "—",
            hint:
              lastAttempt?.topic ??
              (lastAttempt ? "Argomenti misti" : "Nessuno ancora"),
          },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-8">
          <QuizSetup topics={stats.topics} />


        </div>

        <div className="min-w-0 space-y-8">
          <Panel>
            <PanelHeader title="Ripasso mirato" />
            <div className="divide-y divide-neutral-100">
              <ReviewShortcut
                href="/quiz?status=wrong"
                title="Rivedi gli errori"
                detail={
                  wrongCount > 0
                    ? `${formatNumber(wrongCount)} domande con l'ultima risposta errata`
                    : "Nessuna domanda sbagliata da rivedere"
                }
                disabled={wrongCount === 0}
              />
              <ReviewShortcut
                href="/quiz?status=new"
                title="Domande nuove"
                detail={
                  newCount > 0
                    ? `${formatNumber(newCount)} domande mai affrontate`
                    : "Le hai affrontate tutte"
                }
                disabled={newCount === 0}
              />
              <ReviewShortcut
                href="/quiz?status=new&status=wrong"
                title="Nuove e sbagliate"
                detail="Il ripasso consigliato: copre lacune e ripetizioni"
                disabled={newCount + wrongCount === 0}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Ultime esercitazioni"
              action={
                attempts.length > 0 ? (
                  <Link
                    href="/statistiche"
                    className="font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    Tutte
                  </Link>
                ) : null
              }
            />
            {attempts.length === 0 ? (
              <div className="p-5">
                <EmptyState>
                  Non hai ancora svolto esercitazioni. Quando ne terminerai una,
                  la troverai qui.
                </EmptyState>
              </div>
            ) : (
              <AttemptList attempts={attempts.slice(0, 5)} />
            )}
          </Panel>
        </div>
      </div>

      {upcoming.length > 0 ? (
        <section aria-labelledby="in-arrivo" className="mt-10">
          <SectionTitle>
            <span id="in-arrivo">In arrivo</span>
          </SectionTitle>
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
            {upcoming.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-start justify-between gap-4 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-900 group-hover:text-brand-700">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                      {item.description}
                    </span>
                  </span>
                  <Badge>Presto</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageContainer>
  );
}
