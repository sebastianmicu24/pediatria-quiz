-- ─────────────────────────────────────────────────────────────
-- Sessione di quiz in corso — salvataggio di ogni risposta.
--
-- Prima di questa migrazione le risposte venivano salvate tutte
-- insieme alla pressione di "Termina": un errore di connessione dopo
-- un'esercitazione lunga faceva perdere l'intero lavoro.
-- Ora ogni risposta viene scritta subito (RPC `record_quiz_answer`) e
-- l'esercitazione conclusa viene materializzata in un tentativo
-- (RPC `finish_quiz_session`).
--
-- Perché due tabelle nuove invece di colonne su `quiz_attempts`:
--   * `quiz_attempts` resta "esercitazione completata": dashboard,
--     statistiche, area admin ed export non cambiano di una riga;
--   * una sessione per utente (chiave primaria `user_id`): scritture
--     minuscole, nessuna contesa fra utenti diversi, righe eliminate
--     alla conclusione o alla scadenza.
--
-- Il percorso caldo (una risposta) tocca: 1 riga di `quiz_sessions`,
-- 1 riga di `quiz_session_answers`, 1 riga di `question_progress`.
-- Tutte per chiave primaria, tutte dello stesso utente.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.quiz_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  topic text,
  difficulty int,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answers_count int not null default 0 check (answers_count >= 0)
);

comment on table public.quiz_sessions is
  'Esercitazione in corso: una riga per utente, creata alla prima risposta e cancellata alla conclusione o alla scadenza.';

create table if not exists public.quiz_session_answers (
  user_id uuid not null references public.quiz_sessions (user_id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_index int not null check (selected_index >= 0),
  answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

comment on table public.quiz_session_answers is
  'Risposte di un''esercitazione ancora aperta: la chiave (utente, domanda) rende idempotente l''invio ripetuto della stessa risposta.';

-- Nessun indice su `question_id`: servirebbe solo alle rare cancellazioni
-- di domande (cascata), mentre costerebbe una scrittura per ogni risposta.
-- L'ordinamento per `answered_at` avviene su poche righe per utente.

-- ─────────────────────────────────────────────────────────────
-- Ottimizzazioni del percorso caldo
-- ─────────────────────────────────────────────────────────────

-- Ogni risposta aggiorna una riga di questi due tabelle: un po' di
-- spazio libero nella pagina permette l'aggiornamento HOT (la nuova
-- versione della riga resta sulla stessa pagina, senza toccare indici).
alter table public.question_progress set (fillfactor = 80);
alter table public.quiz_sessions set (fillfactor = 80);

-- Questi due indici non sono usati da nessuna query (tutte filtrano e
-- aggregano per `user_id`, quindi usano la chiave primaria) ma
-- contengono colonne che cambiano a ogni risposta: con essi ogni
-- aggiornamento di `question_progress` è costretto a riscrivere due
-- voci di indice. Toglierli rende l'aggiornamento HOT.
drop index if exists public.question_progress_user_correct_idx;
drop index if exists public.question_progress_user_answered_idx;

-- ─────────────────────────────────────────────────────────────
-- RLS: solo le proprie righe (le scritture passano dalle RPC)
-- ─────────────────────────────────────────────────────────────

alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_answers enable row level security;

drop policy if exists "quiz_sessions_select_own" on public.quiz_sessions;
create policy "quiz_sessions_select_own"
  on public.quiz_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "quiz_sessions_insert_own" on public.quiz_sessions;
create policy "quiz_sessions_insert_own"
  on public.quiz_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "quiz_sessions_update_own" on public.quiz_sessions;
create policy "quiz_sessions_update_own"
  on public.quiz_sessions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "quiz_sessions_delete_own" on public.quiz_sessions;
create policy "quiz_sessions_delete_own"
  on public.quiz_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- `user_id` è la chiave della sessione (e la chiave esterna che la
-- lega): non serve una sottoquery per verificare la proprietà.
drop policy if exists "quiz_session_answers_select_own" on public.quiz_session_answers;
create policy "quiz_session_answers_select_own"
  on public.quiz_session_answers for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "quiz_session_answers_insert_own" on public.quiz_session_answers;
create policy "quiz_session_answers_insert_own"
  on public.quiz_session_answers for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "quiz_session_answers_update_own" on public.quiz_session_answers;
create policy "quiz_session_answers_update_own"
  on public.quiz_session_answers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "quiz_session_answers_delete_own" on public.quiz_session_answers;
create policy "quiz_session_answers_delete_own"
  on public.quiz_session_answers for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- RPC: registra una risposta dell'esercitazione in corso.
--
-- La correttezza è calcolata qui (il client non può falsificarla) ed è
-- idempotente: un nuovo invio della stessa risposta (dopo un errore di
-- rete) non cambia nulla e non gonfia i contatori.
--
-- Restituisce `false` quando la risposta va ignorata e non ritentata:
-- domanda non più presente, indice fuori range, limite di sicurezza.
-- ─────────────────────────────────────────────────────────────

create or replace function public.record_quiz_answer(
  p_question_id uuid,
  p_selected_index int,
  p_topic text default null,
  p_difficulty int default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_answer_index int;
  v_options int;
  v_is_correct boolean;
  v_prev_index int;
  v_is_new boolean;
  v_count int := 0;
  v_topic text := nullif(left(btrim(coalesce(p_topic, '')), 80), '');
  v_difficulty int := case when p_difficulty in (1, 2, 3) then p_difficulty else null end;
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  select q.answer_index, jsonb_array_length(q.options)
    into v_answer_index, v_options
    from public.questions q
   where q.id = p_question_id;

  -- Domanda cancellata dall'area admin a esercitazione in corso: la
  -- risposta si scarta senza bloccare il resto dell'esercitazione.
  if not found then
    return false;
  end if;

  if p_selected_index is null
     or p_selected_index < 0
     or p_selected_index >= v_options then
    return false;
  end if;

  v_is_correct := (p_selected_index = v_answer_index);

  -- Si sa prima se la risposta è nuova: così la riga di sessione viene
  -- scritta una volta sola (contatore + attività + argomento).
  select a.selected_index
    into v_prev_index
    from public.quiz_session_answers a
   where a.user_id = v_user_id
     and a.question_id = p_question_id;
  v_is_new := not found;

  -- Limite di sicurezza: una sessione non cresce oltre le 2.000
  -- risposte (lo stesso tetto di save_quiz_attempt).
  if v_is_new then
    select s.answers_count
      into v_count
      from public.quiz_sessions s
     where s.user_id = v_user_id;
    if v_count >= 2000 then
      return false;
    end if;
  end if;

  insert into public.quiz_sessions (
    user_id, topic, difficulty, started_at, updated_at, answers_count
  )
  values (
    v_user_id, v_topic, v_difficulty, now(), now(),
    case when v_is_new then 1 else 0 end
  )
  on conflict (user_id) do update
    set updated_at = now(),
        topic = excluded.topic,
        difficulty = excluded.difficulty,
        answers_count = public.quiz_sessions.answers_count
          + (case when v_is_new then 1 else 0 end);

  insert into public.quiz_session_answers (
    user_id, question_id, selected_index, answered_at
  )
  values (v_user_id, p_question_id, p_selected_index, now())
  on conflict (user_id, question_id) do update
    set selected_index = excluded.selected_index,
        answered_at = excluded.answered_at;

  -- Progressi per domanda aggiornati subito: copertura per argomento e
  -- stato di ripasso seguono l'esercitazione in corso. `answer_count`
  -- cresce solo quando la risposta cambia davvero, così un invio
  -- ripetuto non la gonfia.
  insert into public.question_progress (
    user_id, question_id, selected_index, is_correct, answer_count, answered_at
  )
  values (v_user_id, p_question_id, p_selected_index, v_is_correct, 1, now())
  on conflict (user_id, question_id) do update
    set selected_index = excluded.selected_index,
        is_correct = excluded.is_correct,
        answer_count = case
          when public.question_progress.selected_index = excluded.selected_index
           and public.question_progress.is_correct = excluded.is_correct
          then public.question_progress.answer_count
          else public.question_progress.answer_count + 1
        end,
        answered_at = excluded.answered_at;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: chiude l'esercitazione in corso e crea il tentativo.
--
-- `p_answers` è la coda rimasta sul client (invii falliti): viene
-- registrata prima di chiudere, così "Termina" salva sempre tutto.
-- Totali e correttezza sono ricalcolati in SQL dalle risposte salvate.
-- ─────────────────────────────────────────────────────────────

create or replace function public.finish_quiz_session(
  p_answers jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_topic text;
  v_difficulty int;
  v_attempt_id uuid;
  v_total int;
  v_correct int;
  v_item jsonb;
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_answers is not null
     and jsonb_typeof(p_answers) = 'array'
     and jsonb_array_length(p_answers) > 0 then
    -- Scope della sessione in corso, se esiste: le risposte in coda la
    -- creano al volo, esattamente come farebbe una risposta normale.
    select s.topic, s.difficulty
      into v_topic, v_difficulty
      from public.quiz_sessions s
     where s.user_id = v_user_id;

    -- Le voci malformate vengono saltate invece di far fallire la
    -- chiusura (il client le valida già: è una difesa in più).
    for v_item in select value from jsonb_array_elements(p_answers) loop
      if (v_item ->> 'question_id')
           ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and (v_item ->> 'selected_index') ~ '^[0-9]{1,4}$' then
        perform public.record_quiz_answer(
          (v_item ->> 'question_id')::uuid,
          (v_item ->> 'selected_index')::int,
          v_topic,
          v_difficulty
        );
      end if;
    end loop;
  end if;

  select s.topic, s.difficulty
    into v_topic, v_difficulty
    from public.quiz_sessions s
   where s.user_id = v_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;

  select count(*)::int,
         count(*) filter (where a.selected_index = q.answer_index)::int
    into v_total, v_correct
    from public.quiz_session_answers a
    join public.questions q on q.id = a.question_id
   where a.user_id = v_user_id
     and a.selected_index >= 0
     and a.selected_index < jsonb_array_length(q.options);

  if v_total = 0 then
    delete from public.quiz_sessions where user_id = v_user_id;
    return jsonb_build_object('ok', false, 'reason', 'no_answers');
  end if;

  insert into public.quiz_attempts (
    user_id, topic, difficulty, total_questions, correct_answers
  )
  values (v_user_id, v_topic, v_difficulty, v_total, v_correct)
  returning id into v_attempt_id;

  insert into public.quiz_answers (
    attempt_id, question_id, selected_index, is_correct
  )
  select v_attempt_id, q.id, a.selected_index,
         (a.selected_index = q.answer_index)
    from public.quiz_session_answers a
    join public.questions q on q.id = a.question_id
   where a.user_id = v_user_id
     and a.selected_index >= 0
     and a.selected_index < jsonb_array_length(q.options);

  -- La cascata elimina anche le risposte della sessione.
  delete from public.quiz_sessions where user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'attemptId', v_attempt_id,
    'total', v_total,
    'correct', v_correct
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RPC: scarta l'esercitazione in corso ("Ricomincia da capo").
-- I progressi già registrati per domanda restano: le risposte sono
-- state date davvero.
-- ─────────────────────────────────────────────────────────────

create or replace function public.discard_quiz_session()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.quiz_sessions where user_id = (select auth.uid());
$$;

revoke all on function public.record_quiz_answer(uuid, int, text, int) from public, anon;
grant execute on function public.record_quiz_answer(uuid, int, text, int) to authenticated;

revoke all on function public.finish_quiz_session(jsonb) from public, anon;
grant execute on function public.finish_quiz_session(jsonb) to authenticated;

revoke all on function public.discard_quiz_session() from public, anon;
grant execute on function public.discard_quiz_session() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Permessi delle tabelle (le policy RLS restano il vero filtro)
-- ─────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.quiz_sessions to authenticated;
grant select, insert, update, delete on public.quiz_session_answers to authenticated;

grant all on public.quiz_sessions, public.quiz_session_answers to service_role;

-- ─────────────────────────────────────────────────────────────
-- Pulizia facoltativa delle sessioni abbandonate
--
-- Le sessioni vengono cancellate a ogni "Termina" o "Ricomincia da
-- capo"; quelle mai riportate a termine occupano una riga per utente e
-- vengono ignorate (e rimosse) al primo caricamento di /quiz successivo
-- alle 24 ore. Per ripulire anche gli utenti che non tornano più:
--
--   delete from public.quiz_sessions
--    where updated_at < now() - interval '30 days';
--
-- (la cascata elimina le risposte collegate).
-- ─────────────────────────────────────────────────────────────
