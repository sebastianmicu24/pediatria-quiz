-- ============================================================
--  Migrazione: esercitazione progressiva + filtri multipli
--
--  1. get_quiz_questions: estrazione casuale eseguita in Postgres
--     (ORDER BY random()), scalabile su migliaia di domande.
--     - p_topics / p_difficulties: filtri multipli (array)
--     - p_exclude: id già visti, da non riproporre nei lotti
--       successivi dell'esercitazione
--
--  2. save_quiz_attempt: limite risposte per tentativo 500 → 2000
--     (l'esercitazione è a tempo indeterminato).
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- 1. Funzione di estrazione casuale (filtri multipli + esclusione)
create or replace function public.get_quiz_questions(
  p_count int default 20,
  p_topics text[] default '{}',
  p_difficulties int[] default '{}',
  p_exclude uuid[] default '{}'
)
returns setof public.questions
language sql
volatile
security invoker
set search_path = ''
as $$
  select q.*
  from public.questions q
  where (coalesce(cardinality(p_topics), 0) = 0 or q.topic = any(p_topics))
    and (coalesce(cardinality(p_difficulties), 0) = 0 or q.difficulty = any(p_difficulties))
    and (coalesce(cardinality(p_exclude), 0) = 0 or not (q.id = any(p_exclude)))
  order by random()
  limit least(greatest(coalesce(p_count, 20), 1), 100);
$$;

-- Rimuove eventuali versioni precedenti (firme diverse:
-- senza drop resterebbero più overload della stessa funzione).
drop function if exists public.get_quiz_questions(int, text, int);
drop function if exists public.get_quiz_questions(int, text, int, uuid[]);

revoke all on function public.get_quiz_questions(int, text[], int[], uuid[]) from public, anon;
grant execute on function public.get_quiz_questions(int, text[], int[], uuid[]) to authenticated;

-- 2. Limite risposte per tentativo: 500 → 2000
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

  return v_attempt_id;
end;
$$;

revoke all on function public.save_quiz_attempt(jsonb, text, int) from public, anon;
grant execute on function public.save_quiz_attempt(jsonb, text, int) to authenticated;
