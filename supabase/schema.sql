-- ============================================================
--  Pediatroma - Schema database per Supabase
--  Esegui questo file nell'SQL Editor del tuo progetto Supabase.
--  È idempotente: puoi rieseguirlo senza perdere i dati.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILI
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  accepted_terms_at timestamptz,
  marketing_consent boolean not null default false,
  status text check (
    status is null or status in ('studente', 'specializzando', 'professionista', 'altro')
  ),
  school text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profilo applicativo collegato a auth.users. Contiene le preferenze e i riferimenti ai consensi raccolti in fase di registrazione.';

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
    id, display_name, accepted_terms_at, marketing_consent, status, school, city
  )
  values (
    new.id,
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
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'school', '')), 100), ''),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 7. Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

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
    nullif(btrim(coalesce(p_topic, '')), ''),
    p_difficulty,
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

-- ─────────────────────────────────────────────────────────────
-- 9. Permessi (le policy RLS restano il vero filtro)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

grant select on public.questions to authenticated;

grant select, update on public.profiles to authenticated;

grant select, insert, delete on public.quiz_attempts to authenticated;

grant select, insert, delete on public.quiz_answers to authenticated;

grant all on public.profiles, public.questions, public.quiz_attempts, public.quiz_answers
  to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 10. Migrazioni incrementali (idempotenti)
--     Aggiungono al database esistente le colonne introdotte
--     nelle versioni successive dello schema.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists city text;

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
end $$;
