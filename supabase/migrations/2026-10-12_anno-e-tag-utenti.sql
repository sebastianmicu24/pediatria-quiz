-- ============================================================
--  Migrazione: anno di studi + tag utente
--
--  1. profiles.year: anno di studi (facoltativo, per statistiche)
--  2. profiles.tags: etichette assegnate manualmente dagli admin
--     (es. "utente verificato"). Scrivibili solo dal service role:
--     l'utente può leggerle ma non modificarle.
--  3. Grant aggiornati: l'utente può modificare anche year.
--  4. Trigger di registrazione aggiornato (copia year dai metadati).
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

alter table public.profiles add column if not exists year text;
alter table public.profiles add column if not exists tags text[] not null default '{}';

-- Vincoli (aggiunti solo se mancanti)
do $$
begin
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

-- Permessi: year modificabile dall'utente; tags riservati agli admin
-- (scritti con la secret key / service role).
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, marketing_consent, status, school, city, year)
  on public.profiles to authenticated;
grant select, update on public.profiles to service_role;

-- Trigger di registrazione: copia anche l'anno di studi dai metadati.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, display_name, accepted_terms_at, marketing_consent, status, year, school, city
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
    case
      when (new.raw_user_meta_data ->> 'year') in
        ('1','2','3','4','5','6','specializzazione','altro')
      then new.raw_user_meta_data ->> 'year'
      else null
    end,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'school', '')), 100), ''),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
