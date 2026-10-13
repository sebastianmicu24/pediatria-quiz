-- ============================================================
--  Migrazione: progressi per domanda (ripasso mirato)
--
--  1. question_progress: ultima risposta data a ciascuna domanda
--     (una riga per utente+domanda). Ogni nuova risposta
--     SOVRASCRIVE la precedente, quindi le percentuali per
--     materia riflettono sempre l'ultima risposta.
--  2. save_quiz_attempt: oltre al tentativo, aggiorna i progressi.
--  3. get_quiz_questions: nuovo filtro p_status
--     ('new' = mai risposta, 'correct' = ultima risposta corretta,
--      'wrong' = ultima risposta sbagliata).
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- 1. Tabella dei progressi (una riga per utente + domanda)
create table if not exists public.question_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_index int not null check (selected_index >= 0),
  is_correct boolean not null,
  answer_count int not null default 1 check (answer_count >= 1),
  answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists question_progress_user_correct_idx
  on public.question_progress (user_id, is_correct);

comment on table public.question_progress is 'Ultima risposta di ciascun utente a ciascuna domanda: ogni nuova risposta sovrascrive la precedente.';

alter table public.question_progress enable row level security;

drop policy if exists "question_progress_select_own" on public.question_progress;
create policy "question_progress_select_own"
  on public.question_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "question_progress_insert_own" on public.question_progress;
create policy "question_progress_insert_own"
  on public.question_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "question_progress_update_own" on public.question_progress;
create policy "question_progress_update_own"
  on public.question_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.question_progress to authenticated;
grant all on public.question_progress to service_role;

-- 2. save_quiz_attempt: salva il tentativo e aggiorna i progressi
create or replace function public.save_quiz_attempt(
  p_answers jsonb,
  p_topic text default null,
  p_difficulty int default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt_id uuid;
  v_total int;
  v_correct int;
  v_topic text;
  v_difficulty int;
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Payload risposte non valido';
  end if;

  if jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 2000 then
    raise exception 'Numero di risposte non valido';
  end if;

  -- Normalizza e limita i parametri testuali/opzionali.
  v_topic := nullif(left(btrim(coalesce(p_topic, '')), 80), '');
  v_difficulty := case when p_difficulty in (1, 2, 3) then p_difficulty else null end;

  -- Punteggio calcolato in un'unica passata, confrontando ogni risposta
  -- con la domanda originale (le risposte non valide vengono scartate).
  select
    count(*),
    count(*) filter (where (e ->> 'selected_index')::int = q.answer_index)
  into v_total, v_correct
  from jsonb_array_elements(p_answers) as e
  join public.questions q on q.id = (e ->> 'question_id')::uuid
  where (e ->> 'selected_index')::int >= 0
    and (e ->> 'selected_index')::int < jsonb_array_length(q.options);

  if v_total = 0 then
    raise exception 'Nessuna risposta valida da salvare';
  end if;

  insert into public.quiz_attempts (
    user_id, topic, difficulty, total_questions, correct_answers
  )
  values (
    v_user_id,
    v_topic,
    v_difficulty,
    v_total,
    v_correct
  )
  returning id into v_attempt_id;

  insert into public.quiz_answers (attempt_id, question_id, selected_index, is_correct)
  select
    v_attempt_id,
    q.id,
    (e ->> 'selected_index')::int,
    ((e ->> 'selected_index')::int = q.answer_index)
  from jsonb_array_elements(p_answers) as e
  join public.questions q on q.id = (e ->> 'question_id')::uuid
  where (e ->> 'selected_index')::int >= 0
    and (e ->> 'selected_index')::int < jsonb_array_length(q.options);

  -- Progressi: l'ultima risposta sovrascrive quella precedente.
  insert into public.question_progress (
    user_id, question_id, selected_index, is_correct, answer_count, answered_at
  )
  select
    v_user_id,
    q.id,
    (e ->> 'selected_index')::int,
    ((e ->> 'selected_index')::int = q.answer_index),
    1,
    now()
  from jsonb_array_elements(p_answers) as e
  join public.questions q on q.id = (e ->> 'question_id')::uuid
  where (e ->> 'selected_index')::int >= 0
    and (e ->> 'selected_index')::int < jsonb_array_length(q.options)
  on conflict (user_id, question_id) do update
    set selected_index = excluded.selected_index,
        is_correct = excluded.is_correct,
        answer_count = public.question_progress.answer_count + 1,
        answered_at = now();

  return v_attempt_id;
end;
$$;

revoke all on function public.save_quiz_attempt(jsonb, text, int) from public, anon;
grant execute on function public.save_quiz_attempt(jsonb, text, int) to authenticated;

-- 3. get_quiz_questions: filtri multipli + esclusione + stato di ripasso
create or replace function public.get_quiz_questions(
  p_count int default 20,
  p_topics text[] default '{}',
  p_difficulties int[] default '{}',
  p_exclude uuid[] default '{}',
  p_status text[] default '{}'
)
returns setof public.questions
language sql
volatile
security invoker
set search_path = ''
as $$
  select q.*
  from public.questions q
  left join public.question_progress qp
    on qp.question_id = q.id
   and qp.user_id = (select auth.uid())
  where (coalesce(cardinality(p_topics), 0) = 0 or q.topic = any(p_topics))
    and (coalesce(cardinality(p_difficulties), 0) = 0 or q.difficulty = any(p_difficulties))
    and (coalesce(cardinality(p_exclude), 0) = 0 or not (q.id = any(p_exclude)))
    and (
      coalesce(cardinality(p_status), 0) = 0
      or (qp.question_id is null and 'new' = any(p_status))
      or (qp.is_correct is true and 'correct' = any(p_status))
      or (qp.is_correct is false and 'wrong' = any(p_status))
    )
  order by random()
  limit least(greatest(coalesce(p_count, 20), 1), 100);
$$;

-- Rimuove le versioni precedenti (firme diverse).
drop function if exists public.get_quiz_questions(int, text, int);
drop function if exists public.get_quiz_questions(int, text, int, uuid[]);
drop function if exists public.get_quiz_questions(int, text[], int[], uuid[]);

revoke all on function public.get_quiz_questions(int, text[], int[], uuid[], text[]) from public, anon;
grant execute on function public.get_quiz_questions(int, text[], int[], uuid[], text[]) to authenticated;
