-- ============================================================
--  Migrazione: elenchi admin più leggeri
--
--  Le pagine /admin/quiz e /admin/utenti scaricavano l'intero
--  contenuto delle tabelle (8,79 MB di domande, tutti i profili,
--  tutti i tentativi) per poi filtrare e paginare nel browser.
--
--  1. profiles.email: permette di cercare e mostrare l'email
--     senza scorrere l'Auth Admin API.
--  2. user_attempt_counts: conteggio esercitazioni per utente
--     (una riga per utente invece di una riga per tentativo).
--  3. question_topic_counts: domande disponibili per argomento
--     (19 righe invece di 12.449).
--  4. admin_question_list: elenco domande con il testo senza tag
--     HTML, per la ricerca server-side.
--
--  Le viste sono `security_invoker` e leggibili solo dal service
--  role (l'area admin): non aggiungono superficie pubblica.
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Email nei profili
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists email text;

comment on column public.profiles.email is
  'Email dell''account, sincronizzata da auth.users alla registrazione. Di sola lettura per l''utente (il grant di update non la include).';

-- Il trigger di registrazione salva anche l'email. Se il profilo
-- esiste già (re-inserimento), aggiorna solo l'email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, email, display_name, accepted_terms_at, marketing_consent,
    status, year, school, city
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
      when new.raw_user_meta_data ->> 'status' in
        ('studente', 'specializzando', 'professionista', 'altro')
      then new.raw_user_meta_data ->> 'status'
      else null
    end,
    case
      when new.raw_user_meta_data ->> 'year' in
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

-- Backfill per i profili creati prima di questa migrazione.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

-- ─────────────────────────────────────────────────────────────
-- 2. Esercitazioni per utente
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 3. Domande disponibili per argomento
-- ─────────────────────────────────────────────────────────────
create or replace view public.question_topic_counts
with (security_invoker = true)
as
select topic, count(*)::int as available
from public.questions
group by topic;

revoke all on public.question_topic_counts from anon, authenticated;
grant select on public.question_topic_counts to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Elenco domande per l'area admin
--    question_plain: testo della domanda senza tag HTML, per una
--    ricerca che non trovi i nomi dei tag ("p", "strong", …).
-- ─────────────────────────────────────────────────────────────
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
      regexp_replace(
        regexp_replace(q.question, '<[^>]*>', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    ) as question_plain
  from public.questions q
) q;

revoke all on public.admin_question_list from anon, authenticated;
grant select on public.admin_question_list to service_role;
