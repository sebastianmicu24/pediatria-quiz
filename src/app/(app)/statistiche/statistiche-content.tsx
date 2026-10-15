import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { loadUserStats, type UserStats } from "@/lib/user-stats";
import { formatNumber } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Badge, scoreTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { DailyBars, PrecisionTrend, type DailyPoint } from "@/components/charts";
import { TopicCoverage } from "@/components/topic-coverage";
import { ButtonLink } from "@/components/ui/button";
import { AttemptHistory } from "./attempt-history";

const DAY = 86_400_000;
const WINDOW_DAYS = 30;
const WEAK_THRESHOLD = 0.8;
const WEAK_MIN_ANSWERS = 5;

export async function StatisticheContent() {
  const user = await requireUser("/statistiche");
  const supabase = await createClient();
  const stats = await loadUserStats(supabase, user.id);

  // Pagina renderizzata a request time (dopo la lettura dei cookie).
  // eslint-disable-next-line react-hooks/purity -- request-time, non prerender
  const now = Date.now();

  return <StatisticheView stats={stats} now={now} />;
}

export function StatisticheView({
  stats,
  now,
}: {
  stats: UserStats;
  now: number;
}) {  const { totals, attempts } = stats;

  // ── Attività degli ultimi 30 giorni (fuso orario di Roma) ──────
  const keyFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" });
  const labelFormat = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  });
  const perDay = new Map<string, number>();
  for (const attempt of attempts) {
    const key = keyFormat.format(new Date(attempt.completed_at));
    perDay.set(key, (perDay.get(key) ?? 0) + attempt.total_questions);
  }
  const days: DailyPoint[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const date = new Date(now - i * DAY);
    days.push({
      label: labelFormat.format(date),
      title: labelFormat.format(date),
      value: perDay.get(keyFormat.format(date)) ?? 0,
    });
  }
  const activeDays = days.filter((day) => day.value > 0).length;
  const answeredInWindow = days.reduce((sum, day) => sum + day.value, 0);

  // ── Andamento della precisione (ultime 20, in ordine cronologico) ──
  const trend = attempts
    .filter((attempt) => attempt.total_questions > 0)
    .slice(0, 20)
    .reverse()
    .map((attempt) =>
      Math.round((attempt.correct_answers / attempt.total_questions) * 100)
    );

  // ── Argomenti da rafforzare ─────────────────────────────────
  const weak = stats.coverage
    .filter((row) => row.done >= WEAK_MIN_ANSWERS)
    .map((row) => ({ ...row, ratio: row.correct / row.done }))
    .filter((row) => row.ratio < WEAK_THRESHOLD)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 4);

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Le tue statistiche"
        description="Andamento, copertura e precisione per argomento. Ogni nuova risposta a una domanda sostituisce la precedente."
      />

      {stats.hasError ? (
        <Alert variant="error" className="mt-6">
          Non è stato possibile caricare tutte le statistiche. Riprova tra
          qualche istante.
        </Alert>
      ) : null}

      <StatStrip
        className="mt-8"
        items={[
          {
            label: "Domande risposte",
            value: formatNumber(totals.answered),
            hint: `${formatNumber(totals.attempts)} esercitazioni`,
          },
          {
            label: "Precisione",
            value: formatPercent(totals.correct, totals.answered),
            hint: stats.bestTopic
              ? `Migliore: ${stats.bestTopic.topic} (${formatPercent(stats.bestTopic.correct, stats.bestTopic.total)})`
              : `${formatNumber(totals.correct)} risposte corrette`,
          },
          {
            label: "Copertura",
            value: formatPercent(totals.uniqueDone, totals.available),
            hint: `${formatNumber(totals.uniqueDone)} di ${formatNumber(totals.available)} domande`,
          },
          {
            label: "Giorni attivi",
            value: `${activeDays}/${WINDOW_DAYS}`,
            hint: `${formatNumber(answeredInWindow)} risposte negli ultimi ${WINDOW_DAYS} giorni`,
          },
        ]}
      />

      {totals.attempts === 0 ? (
        <EmptyState
          className="mt-8"
          title="Ancora nessun dato"
          action={<ButtonLink href="/dashboard">Inizia un&apos;esercitazione</ButtonLink>}
        >
          Le statistiche compaiono dopo la prima esercitazione terminata.
        </EmptyState>
      ) : (
        <>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Attività"
                description={`Domande risposte al giorno, ultimi ${WINDOW_DAYS} giorni`}
              />
              <div className="p-5">
                <DailyBars data={days} unit="risposte" />
              </div>
            </Panel>
            <Panel>
              <PanelHeader
                title="Precisione nel tempo"
                description="Percentuale di risposte corrette per esercitazione"
              />
              <div className="p-5">
                <PrecisionTrend values={trend} />
              </div>
            </Panel>
          </div>

          <Panel className="mt-8">
            <PanelHeader
              title="Da rafforzare"
              description={`Argomenti con precisione sotto l'${Math.round(WEAK_THRESHOLD * 100)}% (almeno ${WEAK_MIN_ANSWERS} domande svolte)`}
            />
            {weak.length === 0 ? (
              <p className="px-5 py-6 text-sm text-neutral-500">
                Nessun argomento sotto la soglia: continua a esercitarti per
                mantenere il livello.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {weak.map((row) => {
                  const params = new URLSearchParams();
                  params.append("topic", row.topic);
                  params.append("status", "wrong");
                  return (
                    <li
                      key={row.topic}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {row.topic}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                          {row.correct} corrette su {row.done} svolte
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          tone={scoreTone(row.ratio)}
                          className="tabular-nums"
                        >
                          {Math.round(row.ratio * 100)}%
                        </Badge>
                        <Link
                          href={`/quiz?${params.toString()}`}
                          className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                        >
                          Rivedi gli errori
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      <Panel className="mt-8">
        <PanelHeader
          title="Argomenti"
          description="Copertura e precisione sul totale delle domande disponibili"
        />
        <TopicCoverage data={stats.coverage} />
      </Panel>

      {attempts.length > 0 ? (
        <Panel className="mt-8">
          <PanelHeader
            title="Cronologia"
            description={`${formatNumber(attempts.length)} esercitazioni, dalla più recente`}
          />
          <AttemptHistory attempts={attempts} />
        </Panel>
      ) : null}
    </PageContainer>
  );
}
