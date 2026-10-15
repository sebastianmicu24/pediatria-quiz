-- ============================================================
--  Migrazione: indici ad alto volume + statistiche personali in SQL
--
--  1. Indici mancanti sulle query più pesanti (controllo in
--     docs/PERFORMANCE.md § 5.C): senza questi, i filtri del quiz
--     e le aggregazioni admin leggono l'intera tabella.
--  2. RLS su question_progress: le policy esistono dallo schema,
--     ma l'abilitazione era presente solo nella migrazione
--     2026-10-13. Senza questa riga la tabella resta leggibile e
--     scrivibile da qualsiasi utente autenticato.
--  3. get_user_stats(): dashboard e statistiche personali con una
--     sola chiamata, aggregando in SQL. Prima ogni caricamento
--     scaricava tutte le righe di "questions" (12.449 righe, 13
--     richieste da 1000) solo per contare le domande per materia.
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Indici
-- ─────────────────────────────────────────────────────────────

-- get_quiz_questions filtra per materia e difficoltà; anche l'admin
-- ordina/aggrega per materia.
create index if not exists questions_topic_difficulty_idx
  on public.questions (topic, difficulty);

create index if not exists questions_difficulty_idx
  on public.questions (difficulty);

-- L'ordinamento globale dei tentativi (panoramica admin) non può
-- usare l'indice (user_id, completed_at): serve il solo completed_at.
create index if not exists quiz_attempts_completed_idx
  on public.quiz_attempts (completed_at desc);

-- Analitiche globali sulle risposte.
create index if not exists quiz_answers_question_idx
  on public.quiz_answers (question_id);

-- Attività e "ultimo quiz" per utente.
create index if not exists question_progress_user_answered_idx
  on public.question_progress (user_id, answered_at desc);

-- Elenco utenti dell'area admin.
create index if not exists profiles_created_idx
  on public.profiles (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2. Row Level Security su question_progress
-- ─────────────────────────────────────────────────────────────
alter table public.question_progress enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3. Statistiche personali in una sola chiamata
--    Restituisce esattamente i dati che la dashboard e la pagina
--    statistiche leggevano con 4 query (due delle quali paginate
--    sull'intera tabella domande).
--
--    security invoker + auth.uid(): le policy RLS continuano a
--    valere, la funzione non vede nulla in più dell'utente.
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_user_stats(
  p_attempt_limit int default 100
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as materialized (
    select auth.uid() as uid
  ),
  -- Domande disponibili per materia (19 righe, non 12.449).
  topic_totals as (
    select q.topic::text as topic, count(*)::int as available
    from public.questions q
    group by q.topic
  ),
  -- Esiti per materia: una riga per domanda con l'ultima risposta.
  progress as (
    select q.topic::text as topic,
           count(*)::int as total,
           count(*) filter (where qp.is_correct)::int as correct
    from public.question_progress qp
    join public.questions q on q.id = qp.question_id
    where qp.user_id = (select uid from me)
    group by q.topic
  ),
  attempt_totals as (
    select count(*)::int as attempts,
           coalesce(sum(total_questions), 0)::int as answered,
           coalesce(sum(correct_answers), 0)::int as correct
    from public.quiz_attempts
    where user_id = (select uid from me)
  ),
  recent as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id,
             'topic', t.topic,
             'difficulty', t.difficulty,
             'total_questions', t.total_questions,
             'correct_answers', t.correct_answers,
             'completed_at', t.completed_at
           ) order by t.completed_at desc), '[]'::jsonb) as items
    from (
      select id, topic, difficulty, total_questions, correct_answers, completed_at
      from public.quiz_attempts
      where user_id = (select uid from me)
      order by completed_at desc
      limit greatest(coalesce(p_attempt_limit, 100), 1)
    ) t
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'attempts', (select attempts from attempt_totals),
      'answered', (select answered from attempt_totals),
      'correct', (select correct from attempt_totals),
      'uniqueDone', (select coalesce(sum(total), 0) from progress),
      'uniqueCorrect', (select coalesce(sum(correct), 0) from progress),
      'available', (select coalesce(sum(available), 0) from topic_totals)
    ),
    'topics', (
      select coalesce(jsonb_agg(topic order by topic), '[]'::jsonb)
      from topic_totals
    ),
    'coverage', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'topic', tt.topic,
               'done', coalesce(p.total, 0),
               'correct', coalesce(p.correct, 0),
               'available', tt.available
             )), '[]'::jsonb)
      from topic_totals tt
      left join progress p on p.topic = tt.topic
    ),
    'topicStats', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'topic', topic, 'total', total, 'correct', correct
             ) order by total desc), '[]'::jsonb)
      from progress
    ),
    'attempts', (select items from recent)
  );
$$;

revoke all on function public.get_user_stats(int) from public, anon;
grant execute on function public.get_user_stats(int) to authenticated;
