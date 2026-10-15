import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatPercent } from "@/lib/utils";
import { formatNumber, statusLabel, yearLabel, YEAR_OPTIONS } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { DailyBars, type DailyPoint } from "@/components/charts";

/** Giorni mostrati nel grafico dell'attività. */
const OVERVIEW_DAYS = 14;
const NOT_SPECIFIED = "Non indicato";

type BucketRow = {
  key: string;
  users: number;
  questions: number;
  correct: number;
};

type RankRow = {
  label: string;
  users: number;
  questions: number;
  correct: number;
};

type OverviewPayload = {
  kpi: {
    total_users: number;
    new_users_30: number;
    total_attempts: number;
    total_questions: number;
    total_correct: number;
    active_users_30: number;
  } | null;
  byStatus: BucketRow[] | null;
  byYear: BucketRow[] | null;
  byCity: BucketRow[] | null;
  bySchool: BucketRow[] | null;
  activity: { label: string; count: number }[] | null;
  scores: {
    ge85: number;
    b70_84: number;
    b50_69: number;
    lt50: number;
  } | null;
  byTopic: { topic: string; questions: number; correct: number }[] | null;
};

function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRankRows(
  rows: BucketRow[] | null,
  labelFor: (key: string) => string
): RankRow[] {
  return (rows ?? []).map((row) => ({
    label: labelFor(typeof row.key === "string" ? row.key : ""),
    users: asNumber(row.users),
    questions: asNumber(row.questions),
    correct: asNumber(row.correct),
  }));
}

/**
 * Statistiche aggregate su utenti e quiz. Tutte le aggregazioni
 * avvengono in SQL (get_admin_overview): la pagina non scarica più
 * profili, tentativi e risposte per calcolarle qui.
 */
export async function OverviewContent() {
  await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_admin_overview", {
    p_days: OVERVIEW_DAYS,
  });

  if (error || !data) {
    return (
      <Alert variant="error">
        Impossibile caricare le statistiche. Se il database non è ancora stato
        aggiornato, esegui{" "}
        <code className="rounded bg-white/60 px-1">
          supabase/migrations/2026-10-16_panoramica-admin.sql
        </code>{" "}
        nell&apos;SQL Editor di Supabase e ricarica la pagina.
      </Alert>
    );
  }

  const payload = data as OverviewPayload;
  const kpi = payload.kpi;

  const totalUsers = asNumber(kpi?.total_users);
  const newUsers30 = asNumber(kpi?.new_users_30);
  const totalAttempts = asNumber(kpi?.total_attempts);
  const totalQuestions = asNumber(kpi?.total_questions);
  const totalCorrect = asNumber(kpi?.total_correct);
  const activeUsers30 = asNumber(kpi?.active_users_30);

  const statusRows = toRankRows(
    payload.byStatus,
    (key) => statusLabel(key) ?? NOT_SPECIFIED
  );

  // Per l'anno di studi l'ordine cronologico è più utile di quello per utenti.
  const yearOrder = [...YEAR_OPTIONS.map((option) => option.label), NOT_SPECIFIED];
  const yearRows = toRankRows(
    payload.byYear,
    (key) => yearLabel(key) ?? NOT_SPECIFIED
  ).sort((a, b) => yearOrder.indexOf(a.label) - yearOrder.indexOf(b.label));

  const cityRows = toRankRows(payload.byCity, (key) => key);
  const schoolRows = toRankRows(payload.bySchool, (key) => key);

  const activityPoints: DailyPoint[] = (payload.activity ?? []).map((day) => ({
    label: day.label,
    title: day.label,
    value: asNumber(day.count),
  }));

  const scoreBuckets = [
    { label: "≥ 85%", count: asNumber(payload.scores?.ge85) },
    { label: "70–84%", count: asNumber(payload.scores?.b70_84) },
    { label: "50–69%", count: asNumber(payload.scores?.b50_69) },
    { label: "< 50%", count: asNumber(payload.scores?.lt50) },
  ];
  const scoreMax = Math.max(...scoreBuckets.map((bucket) => bucket.count), 1);

  const topicRows = (payload.byTopic ?? []).map((row) => ({
    topic: row.topic,
    questions: asNumber(row.questions),
    correct: asNumber(row.correct),
  }));

  // Il pannello è renderizzato a request time (dopo la lettura dei cookie
  // in requireUser): leggere l'orologio qui è sicuro.
  // eslint-disable-next-line react-hooks/purity -- request-time, non prerender
  const now = Date.now();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-neutral-600">
          Dati aggregati e anonimi su utenti ed esiti dei quiz.
        </p>
        <p className="text-xs text-neutral-400">
          Aggiornato: {formatDate(new Date(now).toISOString())}
        </p>
      </div>

      <StatStrip
        items={[
          {
            label: "Iscritti",
            value: formatNumber(totalUsers),
            hint: `${newUsers30} nuovi negli ultimi 30 giorni`,
          },
          {
            label: "Attivi (30 giorni)",
            value: formatNumber(activeUsers30),
            hint: "Utenti con almeno un quiz",
          },
          {
            label: "Esercitazioni",
            value: formatNumber(totalAttempts),
            hint: `${formatNumber(totalQuestions)} risposte totali`,
          },
          {
            label: "Precisione media",
            value: formatPercent(totalCorrect, totalQuestions),
            hint: `${formatNumber(totalCorrect)} risposte corrette`,
          },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Attività"
            description={`Esercitazioni completate al giorno, ultimi ${OVERVIEW_DAYS} giorni`}
          />
          <div className="p-5">
            <DailyBars data={activityPoints} unit="esercitazioni" />

            <h3 className="mt-6 text-sm font-semibold text-neutral-900">
              Distribuzione dei punteggi
            </h3>
            <ul className="mt-3 space-y-2.5">
              {scoreBuckets.map((bucket) => (
                <li key={bucket.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs tabular-nums text-neutral-500">
                    {bucket.label}
                  </span>
                  <Meter value={bucket.count} max={scoreMax} label={`${bucket.count} esercitazioni`} />
                  <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-neutral-700">
                    {bucket.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <RankPanel
          title="Esiti per status"
          rows={statusRows}
          empty="Nessun dato disponibile."
        />
        <RankPanel
          title="Esiti per anno di studi"
          rows={yearRows}
          empty="Nessun dato disponibile."
        />
        <RankPanel
          title="Città (prime 8)"
          rows={cityRows}
          empty="Nessun utente ha indicato la città."
        />
        <RankPanel
          title="Scuole e università (prime 8)"
          rows={schoolRows}
          empty="Nessun utente ha indicato la scuola."
        />
      </div>

      <Panel>
        <PanelHeader
          title="Precisione per argomento"
          description="Percentuale di risposte corrette e numero di risposte registrate"
        />
        {topicRows.length === 0 ? (
          <div className="p-5">
            <EmptyState>Nessuna risposta registrata.</EmptyState>
          </div>
        ) : (
          <ul className="grid gap-x-10 gap-y-3 p-5 md:grid-cols-2">
            {topicRows.map((row) => {
              const percent =
                row.questions > 0 ? row.correct / row.questions : 0;
              return (
                <li key={row.topic} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-neutral-700 sm:w-48">
                    {row.topic}
                  </span>
                  <Meter value={percent * 100} label={`${Math.round(percent * 100)}%`} />
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                    {formatPercent(row.correct, row.questions)} ·{" "}
                    {formatNumber(row.questions)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <p className="text-xs leading-relaxed text-neutral-400">
        I dati sono mostrati in forma aggregata. Le statistiche per argomento
        contano le risposte registrate, comprese quelle di esercitazioni
        precedenti alla migrazione dei progressi.
      </p>
    </div>
  );
}

function RankPanel({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: RankRow[];
  empty: string;
}) {
  return (
    <Panel>
      <PanelHeader title={title} />
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState>{empty}</EmptyState>
        </div>
      ) : (
        <ul className="space-y-4 p-5">
          {rows.map((row) => {
            const percent = row.questions > 0 ? row.correct / row.questions : 0;
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {row.label}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {row.users} iscritti
                    {row.questions > 0
                      ? ` · ${formatPercent(row.correct, row.questions)}`
                      : " · nessun quiz"}
                  </p>
                </div>
                <Meter
                  className="mt-2"
                  value={percent * 100}
                  label={`Precisione ${Math.round(percent * 100)}%`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
