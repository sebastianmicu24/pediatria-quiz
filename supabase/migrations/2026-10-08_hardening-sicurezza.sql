-- ============================================================
--  Migrazione: hardening di sicurezza
--
--  1. Profili: l'utente può aggiornare solo i campi che gli
--     competono (niente modifiche a consensi e timestamp).
--  2. save_quiz_attempt: limita la lunghezza dell'argomento e
--     valida la difficoltà.
--  3. Vincolo sulla difficoltà dei tentativi (nuove righe).
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- 1. Permessi a livello di colonna sui profili
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, marketing_consent, status, school, city)
  on public.profiles to authenticated;

-- 2. Funzione di salvataggio tentativo irrobustita
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

  if jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 500 then
    raise exception 'Numero di risposte non valido';
  end if;

  v_topic := nullif(left(btrim(coalesce(p_topic, '')), 80), '');
  v_difficulty := case when p_difficulty in (1, 2, 3) then p_difficulty else null end;

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

-- 3. Vincolo sulla difficoltà (per le nuove righe, senza validare le storiche)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_attempts_difficulty_check'
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_difficulty_check
      check (difficulty is null or difficulty between 1 and 3) not valid;
  end if;
end $$;
