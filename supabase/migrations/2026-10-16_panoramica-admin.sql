-- ============================================================
--  Migrazione: panoramica admin senza scansioni complete
--
--  /admin leggeva tutti i profili, tutti i tentativi e tutte le
--  risposte di tutti gli utenti, poi aggregava in JavaScript:
--  il costo cresceva con i dati accumulati e si ripeteva a ogni
--  apertura della pagina.
--
--  get_admin_overview() fa le stesse aggregazioni in SQL e
--  restituisce un solo oggetto JSON (~qualche KB).
--
--  Nota sul fuso orario: i giorni dell'attività sono calcolati in
--  UTC (impostazione predefinita di Supabase), come faceva la
--  pagina quando leggeva l'orologio del server Vercel, anch'esso
--  in UTC. La pagina statistiche personali usa invece Europe/Rome.
--
--  Esegui questo file nell'SQL Editor di Supabase. È idempotente.
-- ============================================================

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
  -- Una riga per utente, con i suoi totali.
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
