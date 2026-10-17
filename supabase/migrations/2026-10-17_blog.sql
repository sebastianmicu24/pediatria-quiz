-- ============================================================
--  Blog: articoli scritti dagli amministratori, letti dagli utenti.
--  Idempotente: puoi rieseguirla senza perdere i dati.
--  (La stessa sezione è nel file supabase/schema.sql, § 13.)
--
--  Sicurezza:
--   - RLS attiva; gli utenti autenticati leggono SOLO gli articoli
--     pubblicati (policy sotto) e solo le colonne elencate nel GRANT.
--   - Nessun permesso di scrittura per anon/authenticated: creare,
--     modificare ed eliminare articoli è possibile solo dal server
--     con la chiave di servizio, dopo il controllo ADMIN_EMAILS.
--   - Vincoli sui dati (formato dello slug, lunghezze) anche nel
--     database: valgono qualunque sia il codice che scrive.
-- ============================================================

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title text not null
    check (char_length(btrim(title)) between 3 and 150),
  excerpt text not null default ''
    check (char_length(excerpt) <= 300),
  content text not null default ''
    check (char_length(content) <= 200000),
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or published_at is not null)
);

comment on table public.blog_posts is
  'Articoli del blog. Contenuto HTML sanitizzato (allowlist) dal server prima del salvataggio e di nuovo al render. Scritture solo con la chiave di servizio.';

-- Elenco pubblico: solo gli articoli pubblicati, dal più recente.
create index if not exists blog_posts_published_idx
  on public.blog_posts (published_at desc)
  where published;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row
  execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_select_published" on public.blog_posts;
create policy "blog_posts_select_published"
  on public.blog_posts for select
  to authenticated
  using (published);

-- Si parte da zero permessi (i privilegi predefiniti di Supabase li
-- concederebbero a tutti) e si riaprono solo quelli necessari.
revoke all on public.blog_posts from anon, authenticated;
grant select (id, slug, title, excerpt, content, published, published_at, updated_at, created_at)
  on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
