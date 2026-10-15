import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";
import {
  VERIFIED_TAG,
  formatNumber,
  isVerifiedTag,
  statusLabel,
  yearLabel,
} from "@/lib/constants";
import { formatDate, formatPercent } from "@/lib/utils";
import type { TopicCoverageDatum } from "@/lib/types";
import { AttemptList } from "@/components/attempt-list";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { TopicCoverage } from "@/components/topic-coverage";
import {
  ConfirmEmailButton,
  UserTagEditor,
  VerifiedToggle,
} from "../user-controls";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileRow = {
  display_name: string | null;
  status: string | null;
  year?: string | null;
  school: string | null;
  city: string | null;
  tags?: string[] | null;
};

type AttemptRow = {
  id: string;
  topic: string | null;
  difficulty: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

type TopicAnswerRow = {
  is_correct: boolean;
  questions: { topic?: string } | { topic?: string }[] | null;
};

export async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const admin = createAdminClient();

  // Profilo (fallback se le colonne anno/tag non sono ancora presenti).
  async function fetchProfile(): Promise<ProfileRow | null> {
    const withMeta = await admin
      .from("profiles")
      .select("display_name, status, year, school, city, tags")
      .eq("id", id)
      .maybeSingle();
    if (!withMeta.error) return withMeta.data as ProfileRow | null;
    if (!isMissingColumnError(withMeta.error.message)) return null;

    const legacy = await admin
      .from("profiles")
      .select("display_name, status, school, city")
      .eq("id", id)
      .maybeSingle();
    return legacy.data ? { ...legacy.data, year: null, tags: [] } : null;
  }

  // Andamento per materia: ultima risposta per domanda (question_progress)
  // oppure risposte storiche se la migrazione non è ancora applicata.
  async function fetchTopicAnswers(): Promise<TopicAnswerRow[]> {
    const progress = await fetchAllRows<TopicAnswerRow>(() =>
      admin
        .from("question_progress")
        .select("is_correct, questions!inner(topic)")
        .eq("user_id", id)
        .order("question_id", { ascending: true })
    );
    if (!progress.error) return progress.rows;

    const answers = await fetchAllRows<TopicAnswerRow>(() =>
      admin
        .from("quiz_answers")
        .select(
          "is_correct, questions!inner(topic), quiz_attempts!inner(user_id)"
        )
        .eq("quiz_attempts.user_id", id)
        .order("id", { ascending: true })
    );
    return answers.rows;
  }

  // Domande disponibili per argomento: la vista restituisce una riga per
  // argomento (19). Senza la migrazione si leggono le sole materie.
  async function fetchTopicCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const view = await admin
      .from("question_topic_counts")
      .select("topic, available");
    if (!view.error) {
      for (const row of view.data ?? []) {
        counts.set(String(row.topic), Number(row.available) || 0);
      }
      return counts;
    }
    if (!isMissingColumnError(view.error.message)) return counts;

    const { rows } = await fetchAllRows<{ topic: string | null }>(() =>
      admin.from("questions").select("topic").order("id", { ascending: true })
    );
    for (const row of rows) {
      if (!row.topic) continue;
      counts.set(row.topic, (counts.get(row.topic) ?? 0) + 1);
    }
    return counts;
  }

  // Le cinque letture sono indipendenti fra loro: partono insieme invece
  // che una dopo l'altra (con la paginazione di ogni tabella in sequenza).
  const [authResult, profile, attemptsResult, topicRows, topicCounts] =
    await Promise.all([
      admin.auth.admin.getUserById(id),
      fetchProfile(),
      fetchAllRows<AttemptRow>(() =>
        admin
          .from("quiz_attempts")
          .select(
            "id, topic, difficulty, total_questions, correct_answers, completed_at"
          )
          .eq("user_id", id)
          .order("completed_at", { ascending: false })
          .order("id", { ascending: true })
      ),
      fetchTopicAnswers(),
      fetchTopicCounts(),
    ]);

  const authUser = authResult.data?.user;
  if (authResult.error || !authUser) notFound();

  const attempts = attemptsResult.rows;

  const tags = Array.isArray(profile?.tags) ? profile.tags : [];
  const verified = tags.some(isVerifiedTag);

  const topicMap = new Map<string, { total: number; correct: number }>();
  for (const row of topicRows) {
    const nested = row.questions;
    const topic = Array.isArray(nested) ? nested[0]?.topic : nested?.topic;
    if (!topic) continue;
    const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    topicMap.set(topic, entry);
  }

  const coverageData: TopicCoverageDatum[] = [...topicCounts.keys()]
    .map((topic) => ({
      topic,
      done: topicMap.get(topic)?.total ?? 0,
      correct: topicMap.get(topic)?.correct ?? 0,
      available: topicCounts.get(topic) ?? 0,
    }))
    .sort((a, b) => {
      if ((a.done > 0) !== (b.done > 0)) return a.done > 0 ? -1 : 1;
      if (a.done !== b.done) return b.done - a.done;
      return a.topic.localeCompare(b.topic, "it");
    });

  const doneTotal = [...topicMap.values()].reduce(
    (sum, entry) => sum + entry.total,
    0
  );
  const correctTotal = [...topicMap.values()].reduce(
    (sum, entry) => sum + entry.correct,
    0
  );
  const totalAvailable = [...topicCounts.values()].reduce(
    (sum, count) => sum + count,
    0
  );

  const displayName =
    profile?.display_name ?? authUser.email?.split("@")[0] ?? "Utente";

  const details = [
    profile?.status ? statusLabel(profile.status) : null,
    profile?.year ? yearLabel(profile.year) : null,
    profile?.city ?? null,
    profile?.school ?? null,
  ].filter(Boolean);

  return (
    <>
      <Link
        href="/admin/utenti"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Tutti gli utenti
      </Link>

      {/* Scheda utente */}
      <Panel className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-neutral-900">
                {displayName}
              </h2>
              {verified ? (
                <Badge tone="success">
                  <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                  Verificato
                </Badge>
              ) : null}
              {!authUser.email_confirmed_at ? (
                <Badge tone="warning">Email non confermata</Badge>
              ) : null}
            </div>

            <p className="mt-1 truncate text-sm text-neutral-500">
              {authUser.email ?? "—"}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
              <span>Iscritto {formatDate(authUser.created_at)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {authUser.last_sign_in_at
                  ? `Ultimo accesso ${formatDate(authUser.last_sign_in_at)}`
                  : "Mai entrato"}
              </span>
            </p>

            {details.length > 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                {details.join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!authUser.email_confirmed_at ? (
              <ConfirmEmailButton userId={id} size="md" />
            ) : null}
            <VerifiedToggle userId={id} verified={verified} />
          </div>
        </div>

        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-sm font-medium text-neutral-700">Tag</p>
          <div className="mt-2">
            <UserTagEditor userId={id} tags={tags} allTags={tags} />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Il tag «{VERIFIED_TAG}» indica un utente verificato (in futuro
            abiliterà permessi particolari).
          </p>
        </div>
      </Panel>

      {/* Andamento */}
      <StatStrip
        className="mt-8"
        items={[
          {
            label: "Domande svolte",
            value: formatNumber(doneTotal),
            hint: `su ${formatNumber(totalAvailable)} disponibili`,
          },
          {
            label: "Precisione",
            value: formatPercent(correctTotal, doneTotal),
            hint: `${formatNumber(correctTotal)} corrette su ${formatNumber(doneTotal)}`,
          },
          {
            label: "Esercitazioni",
            value: formatNumber(attempts.length),
            hint: "sessioni registrate",
          },
        ]}
      />

      {/* Copertura per argomento */}
      <Panel className="mt-8">
        <PanelHeader
          title="Copertura per argomento"
          description="Corrette, sbagliate e ancora da svolgere sul totale disponibile"
        />
        <TopicCoverage data={coverageData} />
      </Panel>

      {/* Ultime esercitazioni */}
      <Panel className="mt-8">
        <PanelHeader
          title="Ultime esercitazioni"
          description={
            attempts.length > 12
              ? `Mostrate le ultime 12 di ${attempts.length}`
              : undefined
          }
        />
        {attempts.length === 0 ? (
          <div className="p-5">
            <EmptyState>Nessuna esercitazione ancora svolta.</EmptyState>
          </div>
        ) : (
          <AttemptList attempts={attempts.slice(0, 12)} />
        )}
      </Panel>
    </>
  );
}
