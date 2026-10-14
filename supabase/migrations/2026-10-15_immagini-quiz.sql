-- ============================================================
--  Migrazione: immagini dei quiz (Supabase Storage)
--
--  Crea il bucket pubblico "quiz-images" usato dall'editor admin
--  per caricare le immagini delle domande:
--  - lettura pubblica (le immagini compaiono nei quiz per tutti)
--  - scrittura riservata al server (service role): nessuna policy
--    di inserimento per gli utenti normale
--  - limiti: 5 MB, solo PNG/JPG/WebP (niente SVG)
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'quiz-images';
