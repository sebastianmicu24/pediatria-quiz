import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { formatDate, formatPercent } from "@/lib/utils";
import { formatNumber, statusLabel, yearLabel, YEAR_OPTIONS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { DailyBars, type DailyPoint } from "@/components/charts";

type ProfileRow = {
  id: string;
  status: string | null;
  year: string | null;
  school: string | null;
  city: string | null;
  created_at: string;
};

type AttemptRow = {
  id: string;
  user_id: string;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

type AnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

type Bucket = { users: Set<string>; questions: number; correct: number };

function emptyBucket(): Bucket {
  return { users: new Set(), questions: 0, correct: 0 };
}

function addAttempt(bucket: Bucket, attempt: AttemptRow) {
  bucket.questions += attempt.total_questions;
  bucket.correct += attempt.correct_answers;
}

const DAY = 86_400_000;

/**
 * Profili per le statistiche. Se la migrazione di anno/tag non è ancora
 * applicata al database, degrada senza la colonna year (la sezione
 * "Esiti per anno di studi" mostrerà solo "Non indicato").
 */
async function fetchProfilesCompat(
  admin: ReturnType<typeof createAdminClient>
): Promise<ProfileRow[]> {
  const withYear = await fetchAllRows<ProfileRow>(() =>
    admin
      .from("profiles")
      .select("id, status, year, school, city, created_at")
      .order("created_at", { ascending: true })
  );
  if (!withYear.error) return withYear.rows;

  const withoutYear = await fetchAllRows<Omit<ProfileRow, "year">>(() =>
    admin
      .from("profiles")
      .select("id, status, school, city, created_at")
      .order("created_at", { ascending: true })
  );
  return withoutYear.rows.map((row) => ({ ...row, year: null }));
}

export async function OverviewContent() {
  await requireAdmin();

  const admin = createAdminClient();

  const [profiles, attemptsResult, answersResult] = await Promise.all([
    fetchProfilesCompat(admin),
    fetchAllRows<AttemptRow>(() =>
      admin
        .from("quiz_attempts")
        .select("id, user_id, total_questions, correct_answers, completed_at")
        .order("completed_at", { ascending: true })
    ),
    fetchAllRows<AnswerRow>(() =>
      admin
        .from("quiz_answers")
        .select("is_correct, questions!inner(topic)")
        .order("id", { ascending: true })
    ),
  ]);

  const attempts = attemptsResult.rows;
  const answers = answersResult.rows;

  // Il pannello è renderizzato a request time (dopo la lettura dei cookie
  // in requireUser): leggere l'orologio qui è sicuro.
  // eslint-disable-next-line react-hooks/purity -- request-time, non prerender
  const now = Date.now();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  // ── KPI ─────────────────────────────────────────────────────
  const totalUsers = profiles.length;
  const newUsers30 = profiles.filter(
    (profile) => now - Date.parse(profile.created_at) <= 30 * DAY
  ).length;
  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct_answers, 0);
  const activeUsers30 = new Set(
    attempts
      .filter((a) => now - Date.parse(a.completed_at) <= 30 * DAY)
      .map((a) => a.user_id)
  ).size;

  // ── Aggregazioni ────────────────────────────────────────────
  const statusBuckets = new Map<string, Bucket>();
  for (const profile of profiles) {
    const key = statusLabel(profile.status) ?? "Non indicato";
    const bucket = statusBuckets.get(key) ?? emptyBucket();
    bucket.users.add(profile.id);
    statusBuckets.set(key, bucket);
  }

  const yearBuckets = new Map<string, Bucket>();
  for (const profile of profiles) {
    const key = yearLabel(profile.year) ?? "Non indicato";
    const bucket = yearBuckets.get(key) ?? emptyBucket();
    bucket.users.add(profile.id);
    yearBuckets.set(key, bucket);
  }

  const cityBuckets = new Map<string, Bucket>();
  const schoolBuckets = new Map<string, Bucket>();
  for (const profile of profiles) {
    if (profile.city?.trim()) {
      const key = profile.city.trim();
      const bucket = cityBuckets.get(key) ?? emptyBucket();
      bucket.users.add(profile.id);
      cityBuckets.set(key, bucket);
    }
    if (profile.school?.trim()) {
      const key = profile.school.trim();
      const bucket = schoolBuckets.get(key) ?? emptyBucket();
      bucket.users.add(profile.id);
      schoolBuckets.set(key, bucket);
    }
  }

  for (const attempt of attempts) {
    const profile = profileById.get(attempt.user_id);

    const statusKey = statusLabel(profile?.status ?? null) ?? "Non indicato";
    const statusBucket = statusBuckets.get(statusKey) ?? emptyBucket();
    addAttempt(statusBucket, attempt);
    statusBuckets.set(statusKey, statusBucket);

    const yearKey = yearLabel(profile?.year ?? null) ?? "Non indicato";
    const yearBucket = yearBuckets.get(yearKey) ?? emptyBucket();
    addAttempt(yearBucket, attempt);
    yearBuckets.set(yearKey, yearBucket);

    const city = profile?.city?.trim();
    if (city) {
      const bucket = cityBuckets.get(city) ?? emptyBucket();
      addAttempt(bucket, attempt);
      cityBuckets.set(city, bucket);
    }
    const school = profile?.school?.trim();
    if (school) {
      const bucket = schoolBuckets.get(school) ?? emptyBucket();
      addAttempt(bucket, attempt);
      schoolBuckets.set(school, bucket);
    }
  }

  const sortByUsers = (a: [string, Bucket], b: [string, Bucket]) =>
    b[1].users.size - a[1].users.size;
  const statusRows = [...statusBuckets.entries()].sort(sortByUsers);
  const cityRows = [...cityBuckets.entries()].sort(sortByUsers).slice(0, 8);
  const schoolRows = [...schoolBuckets.entries()].sort(sortByUsers).slice(0, 8);

  // Per l'anno di studi l'ordine cronologico è più utile di quello per utenti.
  const yearOrder = [...YEAR_OPTIONS.map((option) => option.label), "Non indicato"];
  const yearRows = [...yearBuckets.entries()].sort(
    (a, b) => yearOrder.indexOf(a[0]) - yearOrder.indexOf(b[0])
  );

  // ── Attività ultimi 14 giorni ───────────────────────────────
  const activityDays: { label: string; count: number }[] = [];
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const start = dayStart.getTime() - i * DAY;
    const end = start + DAY;
    const count = attempts.filter((a) => {
      const time = Date.parse(a.completed_at);
      return time >= start && time < end;
    }).length;
    activityDays.push({
      label: new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(start)),
      count,
    });
  }

  // ── Distribuzione punteggi ──────────────────────────────────
  const scoreBuckets = [
    { label: "≥ 85%", count: 0 },
    { label: "70–84%", count: 0 },
    { label: "50–69%", count: 0 },
    { label: "< 50%", count: 0 },
  ];
  for (const attempt of attempts) {
    if (attempt.total_questions <= 0) continue;
    const percent = attempt.correct_answers / attempt.total_questions;
    if (percent >= 0.85) scoreBuckets[0].count += 1;
    else if (percent >= 0.7) scoreBuckets[1].count += 1;
    else if (percent >= 0.5) scoreBuckets[2].count += 1;
    else scoreBuckets[3].count += 1;
  }
  const scoreMax = Math.max(...scoreBuckets.map((bucket) => bucket.count), 1);

  // ── Precisione per argomento ────────────────────────────────
  const topicBuckets = new Map<string, { questions: number; correct: number }>();
  for (const row of answers) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const bucket = topicBuckets.get(topic) ?? { questions: 0, correct: 0 };
    bucket.questions += 1;
    if (row.is_correct) bucket.correct += 1;
    topicBuckets.set(topic, bucket);
  }
  const topicRows = [...topicBuckets.entries()].sort(
    (a, b) => b[1].questions - a[1].questions
  );

  const activityPoints: DailyPoint[] = activityDays.map((day) => ({
    label: day.label,
    title: day.label,
    value: day.count,
  }));

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
            description="Esercitazioni completate al giorno, ultimi 14 giorni"
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
            {topicRows.map(([topic, bucket]) => {
              const percent =
                bucket.questions > 0 ? bucket.correct / bucket.questions : 0;
              return (
                <li key={topic} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-neutral-700 sm:w-48">
                    {topic}
                  </span>
                  <Meter value={percent * 100} label={`${Math.round(percent * 100)}%`} />
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                    {formatPercent(bucket.correct, bucket.questions)} ·{" "}
                    {formatNumber(bucket.questions)}
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
  rows: [string, Bucket][];
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
          {rows.map(([label, bucket]) => {
            const percent =
              bucket.questions > 0 ? bucket.correct / bucket.questions : 0;
            return (
              <li key={label}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {label}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {bucket.users.size} iscritti
                    {bucket.questions > 0
                      ? ` · ${formatPercent(bucket.correct, bucket.questions)}`
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
