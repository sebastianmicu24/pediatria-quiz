-- ============================================================
--  pediatro.me - Schema database per Supabase
--  Esegui questo file nell'SQL Editor del tuo progetto Supabase.
--  È idempotente: puoi rieseguirlo senza perdere i dati.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILI
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  accepted_terms_at timestamptz,
  marketing_consent boolean not null default false,
  status text check (
    status is null or status in ('studente', 'specializzando', 'professionista', 'altro')
  ),
  year text check (
    year is null or year in ('1','2','3','4','5','6','specializzazione','altro')
  ),
  school text,
  city text,
  tags text[] not null default '{}' check (
    array_length(tags, 1) is null or array_length(tags, 1) <= 10
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profilo applicativo collegato a auth.users. Contiene le preferenze e i riferimenti ai consensi raccolti in fase di registrazione.';

-- ─────────────────────────────────────────────────────────────
-- 1b. Colonne dei profili aggiunte dopo la prima versione dello
--     schema (idempotenti: su un database nuovo esistono già).
--
--     Stanno qui, e non in fondo al file, perché le istruzioni che
--     seguono le citano per nome (es. il GRANT per colonna) e Postgres
--     le verifica subito: su un database più vecchio dello schema il
--     GRANT fallirebbe con "column \"year\" of relation \"profiles\"
--     does not exist" e l'intero script verrebbe annullato.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists year text;
alter table public.profiles add column if not exists tags text[] not null default '{}';
alter table public.profiles add column if not exists email text;

-- ─────────────────────────────────────────────────────────────
-- 2. DOMANDE
-- ─────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  question text not null,
  options jsonb not null,
  answer_index int not null check (answer_index >= 0),
  topic text not null default 'Generale',
  difficulty int not null default 2 check (difficulty between 1 and 3),
  explanation text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.questions is 'Domande dei quiz, importate da data/questions.json tramite scripts/import-questions.mjs.';

-- ─────────────────────────────────────────────────────────────
-- 3. TENTATIVI DI QUIZ
-- ─────────────────────────────────────────────────────────────
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text,
  difficulty int,
  total_questions int not null default 0 check (total_questions >= 0),
  correct_answers int not null default 0 check (correct_answers >= 0),
  completed_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_completed_idx
  on public.quiz_attempts (user_id, completed_at desc);

comment on table public.quiz_attempts is 'Riepilogo dei quiz completati da ciascun utente.';

-- ─────────────────────────────────────────────────────────────
-- 4. RISPOSTE
-- ─────────────────────────────────────────────────────────────
create table if not exists public.quiz_answers (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_index int not null check (selected_index >= 0),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists quiz_answers_attempt_idx
  on public.quiz_answers (attempt_id);

comment on table public.quiz_answers is 'Singole risposte date durante un tentativo.';

-- ─────────────────────────────────────────────────────────────
-- 4b. PROGRESSI PER DOMANDA
--     Ultima risposta di ciascun utente a ciascuna domanda:
--     ogni nuova risposta sovrascrive la precedente, così le
--     percentuali per materia riflettono sempre l'ultima risposta.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.question_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_index int not null check (selected_index >= 0),
  is_correct boolean not null,
  answer_count int not null default 1 check (answer_count >= 1),
  answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Nessun indice secondario: questa riga viene aggiornata a ogni risposta
-- (RPC record_quiz_answer) e un indice su colonne che cambiano a ogni
-- scrittura (is_correct, answered_at) renderebbe l'aggiornamento non-HOT.
-- Lo spazio libero nella pagina lascia invece la nuova versione della
-- riga sulla stessa pagina, senza voci di indice da riscrivere.
alter table public.question_progress set (fillfactor = 80);

comment on table public.question_progress is 'Ultima risposta di ciascun utente a ciascuna domanda: ogni nuova risposta sovrascrive la precedente.';

-- ─────────────────────────────────────────────────────────────
-- 4c. SESSIONE DI QUIZ IN CORSO
--     Le risposte vengono salvate una per una mentre l'utente
--     risponde (RPC record_quiz_answer): un errore di connessione
--     a metà esercitazione non fa perdere i progressi. Alla
--     pressione di "Termina" la sessione diventa un tentativo
--     completato (RPC finish_quiz_session).
--     Una riga per utente: scritture minuscole, nessuna contesa
--     fra utenti diversi, righe eliminate alla conclusione.
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

-- Nessun indice su question_id: servirebbe solo alle rare cancellazioni di
-- domande (cascata), mentre costerebbe una scrittura per ogni risposta.
-- L'ordinamento per answered_at avviene su poche righe per utente.

-- Come question_progress: una riga per utente aggiornata a ogni risposta.
alter table public.quiz_sessions set (fillfactor = 80);

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger updated_at per i profili
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. Creazione automatica del profilo alla registrazione
--    I consensi arrivano dai metadati passati da signUp():
--    accepted_terms: true/false, marketing_consent: true/false
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, email, display_name, accepted_terms_at, marketing_consent, status, year, school, city
  )
  values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 50), ''),
    case
      when (new.raw_user_meta_data -> 'accepted_terms') = 'true'::jsonb then now()
      else null
    end,
    coalesce((new.raw_user_meta_data -> 'marketing_consent') = 'true'::jsonb, false),
    case
      when (new.raw_user_meta_data ->> 'status') in
        ('studente', 'specializzando', 'professionista', 'altro')
      then new.raw_user_meta_data ->> 'status'
      else null
    end,
    case
      when (new.raw_user_meta_data ->> 'year') in
        ('1','2','3','4','5','6','specializzazione','altro')
      then new.raw_user_meta_data ->> 'year'
      else null
    end,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'school', '')), 100), ''),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')), 60), '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Se l'utente cambia email, il profilo resta allineato (la ricerca per
-- email nell'area admin resta corretta).
create or replace function public.handle_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_changed();

-- ─────────────────────────────────────────────────────────────
-- 7. Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.question_progress enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_answers enable row level security;

-- profiles: ogni utente vede e aggiorna solo il proprio profilo.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- questions: leggibili da tutti gli utenti autenticati, non modificabili dal client.
drop policy if exists "questions_select_authenticated" on public.questions;
create policy "questions_select_authenticated"
  on public.questions for select
  to authenticated
  using (true);

-- quiz_attempts: solo i propri tentativi.
drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own"
  on public.quiz_attempts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "quiz_attempts_delete_own" on public.quiz_attempts;
create policy "quiz_attempts_delete_own"
  on public.quiz_attempts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- quiz_answers: leggibili/scrivibili solo tramite un tentativo di proprietà.
drop policy if exists "quiz_answers_select_own" on public.quiz_answers;
create policy "quiz_answers_select_own"
  on public.quiz_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "quiz_answers_insert_own" on public.quiz_answers;
create policy "quiz_answers_insert_own"
  on public.quiz_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "quiz_answers_delete_own" on public.quiz_answers;
create policy "quiz_answers_delete_own"
  on public.quiz_answers for delete
  to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

-- question_progress: ogni utente vede e aggiorna solo i propri progressi
-- (le scritture avvengono tramite le RPC save_quiz_attempt e
-- record_quiz_answer).
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

-- quiz_sessions / quiz_session_answers: una sessione per utente, letta e
-- scritta solo dal proprietario. In quiz_session_answers `user_id` è la
-- chiave della sessione (oltre che chiave esterna): non serve una
-- sottoquery per verificarne la proprietà.
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
-- 8. Funzione RPC: salvataggio atomico di un tentativo.
--    Il punteggio viene calcolato lato server confrontando le
--    risposte con public.questions: il client non può falsificarlo.
--    Nessun UPDATE sui tentativi (bloccato dalle policy RLS):
--    i totali vengono calcolati prima dell'insert.
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 8b. Funzione RPC: estrazione casuale di domande per un quiz.
--     Esegue ORDER BY random() nel database: scala su migliaia di
--     domande senza trasferire l'intero archivio al server Next.
--     p_topics / p_difficulties: filtri multipli (array).
--     p_exclude: id già mostrati, da non riproporre nei lotti
--     successivi dell'esercitazione progressiva.
--     p_status: filtro di ripasso basato sull'ultima risposta
--     ('new' = mai risposta, 'correct', 'wrong').
-- ─────────────────────────────────────────────────────────────
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

-- Rimuove eventuali versioni precedenti (firme diverse).
drop function if exists public.get_quiz_questions(int, text, int);
drop function if exists public.get_quiz_questions(int, text, int, uuid[]);
drop function if exists public.get_quiz_questions(int, text[], int[], uuid[]);
-- Firma presente sul database di produzione (parametri in ordine diverso):
-- senza questa riga resterebbe come funzione morta accanto a quella nuova.
drop function if exists public.get_quiz_questions(int, int, uuid[], text);

revoke all on function public.get_quiz_questions(int, text[], int[], uuid[], text[]) from public, anon;
grant execute on function public.get_quiz_questions(int, text[], int[], uuid[], text[]) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8c. Funzione RPC: statistiche personali in una sola chiamata.
--     Dashboard e pagina statistiche leggevano 4 query, due delle
--     quali paginate sull'intera tabella "questions" (12.449 righe:
--     13 richieste da 1000 per contare le domande per materia).
--     Qui l'aggregazione avviene in SQL e restituiscono 19 righe.
--     security invoker + auth.uid(): valgono le policy RLS, la
--     funzione non vede nulla in più dell'utente che la invoca.
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
  topic_totals as (
    select q.topic::text as topic, count(*)::int as available
    from public.questions q
    group by q.topic
  ),
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

-- ─────────────────────────────────────────────────────────────
-- 8d. Funzioni RPC: sessione di quiz in corso.
--     Prima di questa sezione le risposte venivano salvate tutte
--     insieme alla pressione di "Termina": un errore di connessione
--     dopo un'esercitazione lunga faceva perdere l'intero lavoro.
--     Ora ogni risposta viene scritta subito (record_quiz_answer) e
--     l'esercitazione conclusa diventa un tentativo
--     (finish_quiz_session).
-- ─────────────────────────────────────────────────────────────

-- Registra una risposta dell'esercitazione in corso.
-- La correttezza è calcolata qui (il client non può falsificarla) ed è
-- idempotente: un nuovo invio della stessa risposta (dopo un errore di
-- rete) non cambia nulla e non gonfia i contatori.
-- Restituisce false quando la risposta va ignorata e non ritentata:
-- domanda non più presente, indice fuori range, limite di sicurezza.
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
  -- stato di ripasso seguono l'esercitazione in corso. answer_count
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

-- Chiude l'esercitazione in corso e crea il tentativo.
-- p_answers è la coda rimasta sul client (invii falliti): viene
-- registrata prima di chiudere, così "Termina" salva sempre tutto.
-- Totali e correttezza sono ricalcolati in SQL dalle risposte salvate.
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

-- Scarta l'esercitazione in corso ("Ricomincia da capo").
-- I progressi già registrati per domanda restano: le risposte sono state
-- date davvero.
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
-- 9. Permessi (le policy RLS restano il vero filtro)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

grant select on public.questions to authenticated;

-- L'utente può aggiornare solo i campi che gli competono: i riferimenti
-- ai consensi (accepted_terms_at), i timestamp di auditoria e i tag
-- (assegnati dagli admin) non sono modificabili nemmeno tramite API dirette.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, marketing_consent, status, school, city, year)
  on public.profiles to authenticated;

grant select, insert, delete on public.quiz_attempts to authenticated;

grant select, insert, delete on public.quiz_answers to authenticated;

grant select, insert, update on public.question_progress to authenticated;

grant select, insert, update, delete on public.quiz_sessions to authenticated;

grant select, insert, update, delete on public.quiz_session_answers to authenticated;

grant all on public.profiles, public.questions, public.quiz_attempts, public.quiz_answers
  to service_role;

grant all on public.question_progress to service_role;

grant all on public.quiz_sessions, public.quiz_session_answers to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 9b. Indici per le query ad alto volume
--     (diagnosi e misure in docs/PERFORMANCE.md)
-- ─────────────────────────────────────────────────────────────

-- get_quiz_questions filtra per materia e difficoltà; anche l'admin
-- ordina e aggrega per materia. Senza indice: seq scan su 12.449 righe.
create index if not exists questions_topic_difficulty_idx
  on public.questions (topic, difficulty);

create index if not exists questions_difficulty_idx
  on public.questions (difficulty);

-- L'ordinamento globale dei tentativi (panoramica admin) non può usare
-- l'indice (user_id, completed_at): serve il solo completed_at.
create index if not exists quiz_attempts_completed_idx
  on public.quiz_attempts (completed_at desc);

-- Analitiche globali sulle risposte.
create index if not exists quiz_answers_question_idx
  on public.quiz_answers (question_id);

-- Non c'è più un indice (user_id, answered_at) su question_progress: non
-- era usato da nessuna query e rallentava l'aggiornamento del percorso caldo
-- (vedi la nota alla tabella). Lo stesso per (user_id, is_correct).
drop index if exists public.question_progress_user_answered_idx;
drop index if exists public.question_progress_user_correct_idx;

-- Elenco utenti dell'area admin.
create index if not exists profiles_created_idx
  on public.profiles (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 10. Migrazioni incrementali (idempotenti)
--     Completano i dati di un database esistente. Le colonne nuove
--     dei profili sono aggiunte nella sezione 1b, prima delle
--     istruzioni che le citano.
-- ─────────────────────────────────────────────────────────────

-- Email degli account esistenti (il trigger la salva per i nuovi).
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (
        status is null or status in ('studente', 'specializzando', 'professionista', 'altro')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_year_check'
  ) then
    alter table public.profiles
      add constraint profiles_year_check
      check (
        year is null or year in ('1','2','3','4','5','6','specializzazione','altro')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tags_check'
  ) then
    alter table public.profiles
      add constraint profiles_tags_check
      check (array_length(tags, 1) is null or array_length(tags, 1) <= 10);
  end if;
end $$;

-- Difficoltà dei tentativi: vincolo per le nuove righe (lascia intatte
-- eventuali righe storiche già presenti).
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

-- ─────────────────────────────────────────────────────────────
-- 11. Storage: immagini dei quiz
--     Bucket pubblico "quiz-images" usato dall'editor admin.
--     Lettura pubblica; upload riservato al server (service role).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'quiz-images';

-- ─────────────────────────────────────────────────────────────
-- 12. Viste e funzioni dell'area amministrazione
--     Evitano di scaricare tabelle intere per aggregare in
--     JavaScript (diagnosi e misure in docs/PERFORMANCE.md).
--     Le viste sono security_invoker e leggibili solo dal service
--     role: non aggiungono superficie pubblica.
-- ─────────────────────────────────────────────────────────────

-- Esercitazioni per utente (una riga per utente, non per tentativo).
create or replace view public.user_attempt_counts
with (security_invoker = true)
as
select
  user_id,
  count(*)::int as attempts,
  max(completed_at) as last_attempt
from public.quiz_attempts
group by user_id;

revoke all on public.user_attempt_counts from anon, authenticated;
grant select on public.user_attempt_counts to service_role;

-- Domande disponibili per argomento (19 righe invece di 12.449).
create or replace view public.question_topic_counts
with (security_invoker = true)
as
select topic, count(*)::int as available
from public.questions
group by topic;

revoke all on public.question_topic_counts from anon, authenticated;
grant select on public.question_topic_counts to service_role;

-- Elenco domande per l'area admin. question_plain è il testo senza
-- tag HTML, per una ricerca che non trovi i nomi dei tag.
create or replace view public.admin_question_list
with (security_invoker = true)
as
select
  id,
  source_id,
  question,
  question_plain,
  options,
  answer_index,
  topic,
  difficulty,
  explanation,
  created_at
from (
  select
    q.*,
    btrim(
      regexp_replace(regexp_replace(q.question, '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g')
    ) as question_plain
  from public.questions q
) q;

revoke all on public.admin_question_list from anon, authenticated;
grant select on public.admin_question_list to service_role;

-- ─────────────────────────────────────────────────────────────
-- 12b. Panoramica admin in una sola chiamata
--      Giorni dell'attività in UTC (come l'orologio del server).
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_admin_overview(p_days int default 14)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with prof as (
    select id, status, year, city, school, created_at
    from public.profiles
  ),
  att as (
    select user_id, total_questions, correct_answers, completed_at
    from public.quiz_attempts
  ),
  per_user as (
    select
      p.id, p.status, p.year, p.city, p.school, p.created_at,
      coalesce(sum(a.total_questions), 0)::int as questions,
      coalesce(sum(a.correct_answers), 0)::int as correct
    from prof p
    left join att a on a.user_id = p.id
    group by p.id, p.status, p.year, p.city, p.school, p.created_at
  ),
  kpi as (
    select
      (select count(*)::int from prof) as total_users,
      (select count(*)::int from prof
        where created_at > now() - interval '30 days') as new_users_30,
      (select count(*)::int from att) as total_attempts,
      (select coalesce(sum(total_questions), 0)::int from att) as total_questions,
      (select coalesce(sum(correct_answers), 0)::int from att) as total_correct,
      (select count(distinct user_id)::int from att
        where completed_at > now() - interval '30 days') as active_users_30
  ),
  by_status as (
    select coalesce(status, '') as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user
    group by 1
  ),
  by_year as (
    select coalesce(year, '') as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user
    group by 1
  ),
  by_city as (
    select btrim(city) as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user
    where btrim(coalesce(city, '')) <> ''
    group by 1
    order by 2 desc
    limit 8
  ),
  by_school as (
    select btrim(school) as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user
    where btrim(coalesce(school, '')) <> ''
    group by 1
    order by 2 desc
    limit 8
  ),
  activity as (
    select d.day,
           to_char(d.day, 'DD/MM') as label,
           count(a.user_id)::int as count
    from generate_series(
           date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1),
           date_trunc('day', now()),
           interval '1 day'
         ) as d(day)
    left join att a
      on a.completed_at >= d.day
     and a.completed_at < d.day + interval '1 day'
    group by d.day
  ),
  scores as (
    select
      count(*) filter (
        where total_questions > 0
          and correct_answers::numeric / total_questions >= 0.85
      )::int as ge85,
      count(*) filter (
        where total_questions > 0
          and correct_answers::numeric / total_questions >= 0.70
          and correct_answers::numeric / total_questions < 0.85
      )::int as b70_84,
      count(*) filter (
        where total_questions > 0
          and correct_answers::numeric / total_questions >= 0.50
          and correct_answers::numeric / total_questions < 0.70
      )::int as b50_69,
      count(*) filter (
        where total_questions > 0
          and correct_answers::numeric / total_questions < 0.50
      )::int as lt50
    from att
  ),
  by_topic as (
    select q.topic::text as topic, count(*)::int as questions,
           count(*) filter (where a.is_correct)::int as correct
    from public.quiz_answers a
    join public.questions q on q.id = a.question_id
    group by 1
  )
  select jsonb_build_object(
    'kpi', (select to_jsonb(k) from kpi k),
    'byStatus', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.users desc), '[]'::jsonb)
      from by_status b
    ),
    'byYear', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.key), '[]'::jsonb)
      from by_year b
    ),
    'byCity', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.users desc), '[]'::jsonb)
      from by_city c
    ),
    'bySchool', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.users desc), '[]'::jsonb)
      from by_school s
    ),
    'activity', (
      select coalesce(jsonb_agg(to_jsonb(a) - 'day' order by a.day), '[]'::jsonb)
      from activity a
    ),
    'scores', (select to_jsonb(s) from scores s),
    'byTopic', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.questions desc), '[]'::jsonb)
      from by_topic t
    )
  );
$$;

revoke all on function public.get_admin_overview(int) from public, anon, authenticated;
grant execute on function public.get_admin_overview(int) to service_role;
