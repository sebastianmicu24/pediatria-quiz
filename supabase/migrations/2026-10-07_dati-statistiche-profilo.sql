-- ============================================================
--  Migrazione: dati facoltativi del profilo per le statistiche
--  (status, scuola/università, città)
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente:
--  puoi rieseguirlo senza perdere dati.
-- ============================================================

-- 1. Nuove colonne
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists city text;

-- 2. Vincolo sui valori ammessi per status
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

-- 3. La funzione di creazione profilo copia anche i nuovi metadati
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
