-- ============================================================
--  Migrazione: esercitazione progressiva + estrazione casuale
--
--  1. get_quiz_questions: esegue ORDER BY random() direttamente
--     in Postgres (scala su migliaia di domande senza trasferire
--     l'intero archivio). Nuovo parametro p_exclude: le domande
--     già mostrate all'utente non vengono riproposte nei lotti
--     successivi dell'esercitazione.
--
--  2. save_quiz_attempt: alza il limite di risposte per tentativo
--     da 500 a 2000 (l'esercitazione è a tempo indeterminato:
--     l'utente può terminare quando vuoi).
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- 1. Funzione di estrazione casuale (con esclusione)
create or replace function public.get_quiz_questions(
  p_count int default 20,
  p_topic text default null,
  p_difficulty int default null,
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
  where (nullif(btrim(coalesce(p_topic, '')), '') is null or q.topic = btrim(p_topic))
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (cardinality(p_exclude) = 0 or not (q.id = any(p_exclude)))
  order by random()
  limit least(greatest(coalesce(p_count, 20), 1), 100);
$$;

-- Rimuove l'eventuale versione precedente a 3 parametri
-- (firme diverse: senza drop resterebbero due overload).
drop function if exists public.get_quiz_questions(int, text, int);

revoke all on function public.get_quiz_questions(int, text, int, uuid[]) from public, anon;
grant execute on function public.get_quiz_questions(int, text, int, uuid[]) to authenticated;

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
