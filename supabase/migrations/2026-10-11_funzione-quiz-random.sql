-- ============================================================
--  Migrazione: estrazione casuale delle domande lato database
--
--  Aggiunge la funzione RPC get_quiz_questions: esegue
--  ORDER BY random() direttamente in Postgres, scalando su
--  migliaia di domande senza trasferire l'intero archivio.
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

create or replace function public.get_quiz_questions(
  p_count int default 20,
  p_topic text default null,
  p_difficulty int default null
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
  order by random()
  limit least(greatest(coalesce(p_count, 20), 1), 100);
$$;

revoke all on function public.get_quiz_questions(int, text, int) from public, anon;
grant execute on function public.get_quiz_questions(int, text, int) to authenticated;
