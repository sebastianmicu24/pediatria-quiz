# pediatro.me — Audit prestazioni backend

**Data:** 16 ottobre 2026
**Ambito:** tutte le chiamate dati server → Supabase per dashboard, quiz, statistiche, area admin, account.
**Metodo:** analisi statica di *ogni* punto di accesso ai dati (client, tabella, colonne, filtri, paginazione, concorrenza) + audit dello schema/indici/RLS + misurazione offline del dataset reale (`data/questions.json`, 12.449 domande) per quantificare byte e round trip.
**Non incluso:** profilazione a caldo sul database di produzione (non ho accesso al progetto Supabase). Dove il numero è stimato è marcato come *(stima)*; dove è misurato c'è il conteggio esatto.

---

## 1. Sommario esecutivo

Il collo di bottiglia **non è Postgres**: è il pattern con cui l'applicazione interroga il database.

Tre cause, in ordine di impatto:

1. **Aggregazioni fatte in JavaScript su tabelle intere.** Dashboard, statistiche e tutte e tre le pagine admin scaricano tabelle complete (o quasi) e poi calcolano somme, medie e bucket in Node. Il database serve solo per filtrare `user_id`; tutto il resto è trasferimento di dati inutili.
2. **Paginazione sequenziale (`fetchAllRows`) con pagine da 1000 righe.** Leggere una tabella da 12.449 righe costa **13 round trip HTTP in serie** (non in parallelo). Lo stesso scan della tabella `questions` viene ripetuto su **ogni** caricamento di dashboard, statistiche, e su due pagine admin.
3. **Zero caching a livello Next.js.** `cacheComponents: true` è abilitato in `next.config.ts` (righe 44-45) ma **non c'è un solo `"use cache"`, `cacheLife`, `cacheTag` o `revalidate` in tutto `src/`**. Il catalogo delle domande (che cambia poche volte al mese, mai da parte degli utenti) viene rimaterializzato identico a ogni request.

### Numeri chiave (misurati sul dataset reale)

| Misura | Valore |
|---|---|
| Domande in archivio | **12.449** |
| Peso medio riga JSON completa (question + options + explanation) | **741 byte** (p50 699 · p90 1017 · p99 1382) |
| Trasferimento totale di `select *` dalle domande | **8,79 MB** |
| Trasferimento di `select topic` (solo argomento) | **0,37 MB** (32 B/riga) |
| Trasferimento di `question_progress` + `questions(topic)` (utente che ha risposto a tutto) | **0,75 MB** (64 B/riga) |
| Pagine da 1000 righe necessarie per la tabella `questions` | **13 round trip** |
| Peso RSC inviato al browser dalla pagina `/admin/quiz` | **~8,8 MB** per ogni apertura |

### Impatto in soldi e in capacità

- **Dashboard/statistiche, ogni caricamento (situazione attuale):** fino a ~28 richieste PostgREST e ~1,1 MB di egress *(stima)*. Con 5 GB/mese di egress inclusi (piano Free) si esauriscono dopo **~4.500 visualizzazioni di dashboard**. Con 100 utenti che aprono la dashboard una volta al giorno, si supera il limite del piano Free in meno di due mesi; è il tipo di traffico che manda in overage un piano Pro.
- **`/admin/quiz`:** ~8,8 MB di payload verso il browser per apertura → **~11.600 aperture** prima di esaurire i 100 GB di Fast Data Transfer inclusi nel piano Vercel Hobby (1 TB in Pro → ~119.000 aperture). Per una pagina che serve solo a *cercare* una domanda è il costo più alto del sito.
- **Capacità con utenti concorrenti:** oggi ogni render di dashboard tiene occupata una function serverless per tutta la durata di 13+13 round trip sequenziali. Ridurre il lavoro a **1 round trip** significa (a) latenza percepita da ~1-2 s a ~150-250 ms e (b) ~5-8× la densità di utenti per istanza.

### Obiettivo realizzabile

Portare dashboard e statistiche da ~1,1 MB / ~28 richieste a **~10 KB / 2-3 richieste**, e `/admin/quiz` da 8,8 MB a **~50 KB**, **senza cambiare l'interfaccia**.

---

## 2. Mappa dei costi per pagina

Round trip = richieste HTTP a PostgREST/Auth. Byte = payload di risposta (stima da colonne×righe reali).

| Pagina | Richieste oggi | Byte trasferiti | Dove si aggrega | Richieste dopo il piano |
|---|---|---|---|---|
| `/dashboard` | 4 min · **28 peggiore** | ~1,1 MB *(stima)* | JS (`user-stats.ts`) | 3 |
| `/statistiche` | 3 min · **27 peggiore** | ~1,1 MB *(stima)* | JS (`user-stats.ts`) | 2 |
| `/quiz` (primo lotto) | 2-3 | ~30 KB | Postgres (RPC) | 2 |
| `/quiz` (ogni 7 risposte) | 2-3 | ~15 KB + ~180 KB di `exclude` in ingresso | Postgres | 1-2 |
| `/admin` (panoramica) | **3 scan completi**, ~30+ pagine da 1000 | ~6,4 MB ogni 100.000 risposte registrate *(stima: 64 B/riga)* | JS (`overview-content.tsx`) | 1 |
| `/admin/quiz` | 1 scan completo (13 pagine) | **8,79 MB** dal DB + **8,8 MB** al browser | JS + browser | 2 (~50 KB) |
| `/admin/utenti` | **fino a 20 chiamate Auth API** + 2 scan | ~2,5 MB con 50.000 tentativi *(stima)* | JS + browser | 2-3 |
| `/admin/utenti/[id]` | **5 round trip in serie** | ~0,5-1 MB | JS | 2-3 |
| `/account` | 1 (+1 fallback) | <1 KB | — | ok |
| `/api/account/export` | 1 query con join profondi | variabile | — | ok (on-demand) |

---

## 3. Problemi trasversali

### P1 — Aggregazioni in JS su tabelle intere (impatto: critico)

Il database fa solo da trasportatore. Esempio in `src/lib/user-stats.ts:65-108`: per mostrare 19 argomenti e una percentuale, si scaricano **tutte** le 12.449 righe di `questions` (solo la colonna `topic`, 0,37 MB) e **tutte** le righe di `question_progress` dell'utente, poi si contano in Node. Le stesse identiche operazioni sono in `admin/overview-content.tsx:77-91` (tutte le risposte di tutti gli utenti, con join) e `admin/utenti/[id]/admin-user-detail.tsx:135-138` (di nuovo tutto `questions.topic`).

Un `group by topic` fa lo stesso lavoro in **2-5 ms** e restituisce 19 righe invece di 12.449.

### P2 — Paginazione sequenziale (impatto: alto)

`src/lib/supabase/paginate.ts:17-25`:

```ts
const pageSize = 1000;
for (let from = 0; from < maxRows; from += pageSize) {
  const { data } = await makeQuery().range(from, from + pageSize - 1); // ← await in serie
  ...
}
```

PostgREST di Supabase restituisce al massimo 1000 righe per richiesta, quindi 12.449 righe = 13 richieste **in sequenza**. A ~50-80 ms di round trip (Vercel ↔ Supabase nella stessa region) sono **~0,7-1,0 s solo per scaricare la colonna `topic`**, e altrettanti per i progressi dell'utente. Questo è, misurato dal punto di vista dell'utente, il "girare lento" delle pagine.

### P3 — Nessun caching (impatto: alto)

`cacheComponents: true` e `partialPrefetching: true` sono attivi, ma nessuna funzione usa `"use cache"`. Il catalogo domande/argomenti è **identico per tutti gli utenti** e cambia solo quando un admin modifica il quiz: è il candidato perfetto per `"use cache"` + `cacheTag("questions")`, invalidato dalle server action admin. Oggi costa 0,37 MB e 13 round trip **per utente per page view**.

### P4 — Doppia verifica dell'autenticazione per richiesta (impatto: medio)

`src/lib/supabase/proxy.ts:54-56` chiama `supabase.auth.getUser()` su **ogni** richiesta (il matcher copre tutte le rotte). Poi la pagina chiama di nuovo `getUser()` via `getCurrentUser` (`src/lib/auth.ts:19-22`, deduplicato da React `cache()` **solo** dentro il render, non con il proxy). Sono **fino a 2 round trip all'API Auth di Supabase prima di aver letto un solo dato**. Con `getClaims()` (verifica locale del JWT via JWKS in cache, supabase-js ≥ 2.77; qui `^2.117.3`) il costo sparisce.

### P5 — Liste admin senza paginazione lato server (impatto: alto)

- `/admin/quiz`: tutte le domande con HTML, opzioni e spiegazioni → 8,79 MB dal DB e RSC al browser; ricerca, filtro e paginazione (20/pagina) avvengono nel browser (`quiz-manager.tsx:40,63-80`).
- `/admin/utenti`: ciclo `admin.auth.admin.listUsers({ perPage: 1000 })` fino a **20 chiamate sequenziali** + tutti i profili + tutta la tabella `quiz_attempts` (solo `user_id`, fino a 50.000 righe) **solo per contare i quiz per utente**. Filtro e ordinamento nel browser.

### P6 — `get_quiz_questions`: indici mancanti + `order by random()` (impatto: medio)

`schema.sql:393-422`. Tre problemi:

1. **Nessun indice su `questions(topic)` né `questions(difficulty)`** → con un filtro attivo (es. "Neonatologia") Postgres fa **seq scan su tutte le 12.449 righe** (8,79 MB di heap) e poi ordina.
2. `order by random()` materializza e ordina l'intero set filtrato: ~10-25 ms su 12k righe. Accettabile una volta, ripetuto a ogni lotto da ogni utente diventa CPU serializzata.
3. `p_exclude` può arrivare a **5000 UUID** (`quiz/actions.ts:117-121`) → ~180 KB di body per chiamata, per escludere righe che il client ha già in memoria.

### P7 — Indici mancanti (impatto: medio)

| Tabella | Query che ne ha bisogno | Indice oggi |
|---|---|---|
| `questions` | filtro/aggregazione per `topic`, `difficulty` (`get_quiz_questions`, admin) | ❌ nessuno |
| `quiz_attempts` | ordinamento globale per `completed_at` (admin overview) | ❌ (esiste solo `(user_id, completed_at desc)`, il prefisso non serve) |
| `quiz_answers` | join/aggregazione globale per analitiche admin | solo `(attempt_id)` |
| `question_progress` | attività per data | solo `(user_id, is_correct)` e PK |
| `profiles` | ordinamento per `created_at` (admin) | ❌ nessuno |

### P8 — Colonne pesanti quando non servono (impatto: medio)

`/admin/quiz` scarica `explanation` (fino a 10.000 caratteri/riga) e l'HTML completo di **tutte** le domande per mostrare una lista con anteprima. La spiegazione serve solo quando l'admin apre una domanda: va caricata a parte. Vale anche per il fallback di `src/lib/questions.ts:125-141` (fino a 3 × 800 righe con tutte le colonne).

### P9 — Fallback troppo aggressivi (impatto: basso)

`src/lib/user-stats.ts:27-34`: **qualunque** errore su `question_progress` (anche un timeout transitorio) fa ricadere sul percorso lento su `quiz_answers`. Il fallback dovrebbe scattare solo per "tabella/colonna mancante" (`PGRST205` / `42P01` / `42703`). Lo stesso in `questions.ts:82-152` (fallback che esegue `count: exact` + 3 letture) e in tutte le `fetchProfilesCompat`.

---

## 4. Nota di sicurezza emersa durante l'audit

`schema.sql` **non esegue `enable row level security` su `public.question_progress`**: le policy sono definite (righe 257-274) e i grant assegnati (riga 451), ma l'abilitazione esiste **solo** nella migrazione `2026-10-13_progressi-domande.sql:32`. Su un'installazione che applica `schema.sql` senza le migrazioni, la tabella resta **senza RLS** → qualsiasi utente autenticato può leggere e scrivere i progressi di tutti. Da sistemare (una riga) a prescindere dalle prestazioni.

```sql
alter table public.question_progress enable row level security;
```

*(Se la migrazione 2026-10-13 è già stata applicata in produzione, la produzione è a posto; è `schema.sql` da correggere per le installazioni future.)*

---

## 5. Interventi consigliati

Ordinati per rapporto impatto/sforzo. Tutto è **additivo**: nessuna interfaccia cambia.

### A. RPC `get_user_stats()` — dashboard e statistiche (impatto: massimo, sforzo: ~2 h)

Sostituisce le 4 query di `loadUserStats` (inclusi i due `fetchAllRows`) con **una chiamata** che restituisce ~2-4 KB di JSON. SQL pronto (compatibile con RLS: `security invoker`, filtra `auth.uid()`):

```sql
create or replace function public.get_user_stats(p_attempt_limit int default 100)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as materialized (select auth.uid() as uid),
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
             'id', t.id, 'topic', t.topic, 'difficulty', t.difficulty,
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
      'attempts',     (select attempts from attempt_totals),
      'answered',     (select answered from attempt_totals),
      'correct',      (select correct  from attempt_totals),
      'uniqueDone',   (select coalesce(sum(total), 0)   from progress),
      'uniqueCorrect',(select coalesce(sum(correct), 0) from progress),
      'available',    (select coalesce(sum(available), 0) from topic_totals)
    ),
    'topics',     (select coalesce(jsonb_agg(topic order by topic), '[]'::jsonb) from topic_totals),
    'coverage',   (
      select coalesce(jsonb_agg(jsonb_build_object(
               'topic', tt.topic,
               'done', coalesce(p.total, 0),
               'correct', coalesce(p.correct, 0),
               'available', tt.available
             )), '[]'::jsonb)
      from topic_totals tt left join progress p on p.topic = tt.topic
    ),
    'topicStats', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'topic', topic, 'total', total, 'correct', correct
             ) order by total desc), '[]'::jsonb)
      from progress
    ),
    'attempts',   (select items from recent)
  );
$$;

revoke all on function public.get_user_stats(int) from public, anon;
grant execute on function public.get_user_stats(int) to authenticated;
```

Lato app: `loadUserStats` diventa `const { data } = await supabase.rpc("get_user_stats")` + le stesse poche righe di ordinamento (`coverage` per `done`, `topics` con `localeCompare("it")`: 19 elementi, costo zero) e il calcolo di best/worst che già esiste. L'app passa `p_attempt_limit = 500` per mantenere la stessa cronologia di oggi; l'elenco si potrà paginare lato server in una fase successiva.

**Risultato:** dashboard/statistiche passano a **1 richiesta dati**, ~2-4 KB, ~5-15 ms di DB. Elimina anche il troncamento silenzioso a 500 tentativi nei **totali** (ora sono un `count(*)` vero, mentre la lista resta limitata come prima).

### B. Catalogo argomenti con `"use cache"` (impatto: alto, sforzo: ~30 min)

Se per qualche pagina serve ancora l'elenco argomenti/disponibilità (quiz loader, futuri filtri), non rileggere 12.449 righe: esponi un aggregato e mettilo in cache Next.

```sql
create or replace view public.question_topic_counts as
select topic, count(*)::int as available
from public.questions
group by topic;
```

```ts
// src/lib/catalog.ts
import { cacheLife, cacheTag } from "next/cache";      // Cache Components (Next 16)
import { createAdminClient } from "@/lib/supabase/admin";

export async function getTopicCatalog() {
  "use cache";
  cacheLife("days");
  cacheTag("questions");
  const admin = createAdminClient();                  // il catalogo non è dato personale
  const { data } = await admin.from("question_topic_counts").select("topic, available");
  return data ?? [];
}
```

Dalle server action admin che scrivono su `questions` (`admin/quiz/actions.ts:23-117`) chiamare `revalidateTag("questions")` dopo l'aggiornamento. Così l'aggregato si calcola una volta ogni giorni invece che a ogni request.

### C. Indici (impatto: alto, sforzo: 5 min)

```sql
-- filtri del quiz e aggregazioni admin
create index if not exists questions_topic_difficulty_idx
  on public.questions (topic, difficulty);
create index if not exists questions_difficulty_idx
  on public.questions (difficulty);

-- analytics admin su tutta la tabella
create index if not exists quiz_attempts_completed_idx
  on public.quiz_attempts (completed_at desc);
create index if not exists quiz_answers_question_idx
  on public.quiz_answers (question_id);

-- attività e "ultimo quiz" per utente
create index if not exists question_progress_user_answered_idx
  on public.question_progress (user_id, answered_at desc);

-- elenco utenti admin
create index if not exists profiles_created_idx
  on public.profiles (created_at desc);

-- ricerca admin sulle domande (opzionale, se si usa ilike)
create extension if not exists pg_trgm;
create index if not exists questions_question_trgm_idx
  on public.questions using gin (question gin_trgm_ops);
```

### D. Admin panoramica: un RPC invece di 3 scan completi (impatto: alto, sforzo: ~3-4 h)

`overview-content.tsx` deve continuare a mostrare le stesse cose (KPI, bucket per status/anno/città/scuola, attività 14 giorni, distribuzione punteggi, precisione per argomento) ma calcolate in SQL. Chiamata con il client **service-role** e `security invoker`: la funzione gira come `service_role`, quindi bypassa RLS senza bisogno di `security definer` e senza esporre nulla ai client normali.

```sql
create or replace function public.get_admin_overview(p_days int default 14)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with prof as (
    select id, status, year, city, school, created_at from public.profiles
  ),
  att as (
    select user_id, total_questions, correct_answers, completed_at
    from public.quiz_attempts
  ),
  -- una riga per utente con i suoi totali
  per_user as (
    select p.id, p.status, p.year, p.city, p.school, p.created_at,
           coalesce(sum(a.total_questions), 0)::int as questions,
           coalesce(sum(a.correct_answers), 0)::int as correct
    from prof p
    left join att a on a.user_id = p.id
    group by p.id, p.status, p.year, p.city, p.school, p.created_at
  ),
  kpi as (
    select
      (select count(*)::int from prof) as total_users,
      (select count(*)::int from prof where created_at > now() - interval '30 days') as new_users_30,
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
    from per_user group by 1
  ),
  by_year as (
    select coalesce(year, '') as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user group by 1
  ),
  by_city as (
    select btrim(city) as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user where btrim(coalesce(city, '')) <> ''
    group by 1 order by 2 desc limit 8
  ),
  by_school as (
    select btrim(school) as key, count(*)::int as users,
           coalesce(sum(questions), 0)::int as questions,
           coalesce(sum(correct), 0)::int as correct
    from per_user where btrim(coalesce(school, '')) <> ''
    group by 1 order by 2 desc limit 8
  ),
  activity as (
    select to_char(d.day, 'DD/MM') as label,
           count(a.user_id)::int as count
    from generate_series(
           date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1),
           date_trunc('day', now()),
           interval '1 day'
         ) as d(day)
    left join att a
      on a.completed_at >= d.day and a.completed_at < d.day + interval '1 day'
    group by d.day order by d.day
  ),
  scores as (
    select
      count(*) filter (where total_questions > 0
        and correct_answers::numeric / total_questions >= 0.85)::int as ge85,
      count(*) filter (where total_questions > 0
        and correct_answers::numeric / total_questions >= 0.70
        and correct_answers::numeric / total_questions <  0.85)::int as b70_84,
      count(*) filter (where total_questions > 0
        and correct_answers::numeric / total_questions >= 0.50
        and correct_answers::numeric / total_questions <  0.70)::int as b50_69,
      count(*) filter (where total_questions > 0
        and correct_answers::numeric / total_questions <  0.50)::int as lt50
    from att
  ),
  by_topic as (
    select q.topic::text as topic, count(*)::int as questions,
           count(*) filter (where a.is_correct)::int as correct
    from public.quiz_answers a
    join public.questions q on q.id = a.question_id
    group by q.topic
  )
  select jsonb_build_object(
    'kpi',        (select to_jsonb(k) from kpi k),
    'byStatus',   (select coalesce(jsonb_agg(to_jsonb(b) order by b.users desc), '[]'::jsonb) from by_status b),
    'byYear',     (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from by_year b),
    'byCity',     (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from by_city b),
    'bySchool',   (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from by_school b),
    'activity',   (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from activity a),
    'scores',     (select to_jsonb(s) from scores s),
    'byTopic',    (select coalesce(jsonb_agg(to_jsonb(t) order by t.questions desc), '[]'::jsonb) from by_topic t)
  );
$$;

revoke all on function public.get_admin_overview(int) from public, anon, authenticated;
grant execute on function public.get_admin_overview(int) to service_role;
```

Lato app: `overview-content.tsx` si riduce a `const { data } = await admin.rpc("get_admin_overview", { p_days: 14 })` + le etichette (`statusLabel`/`yearLabel`, ordinamento di `YEAR_OPTIONS`): il resto della logica JS (righe 100-245) sparisce.

**Attenzione (fuso orario):** i bucket giornalieri oggi usano l'ora locale del server; il SQL usa UTC. Per non cambiare i numeri mostrati, aggiungere un parametro `p_tz text default 'Europe/Rome'` e calcolare i giorni con `(now() at time zone p_tz)::date`.

**Alternativa "a costo zero"** se le analitiche possono essere vecchie di qualche minuto: materialized view + `pg_cron` ogni 5-15 minuti. È la scelta migliore oltre i ~10.000 tentativi totali, ma introduce un dato non in tempo reale (l'intestazione "Aggiornato:" della pagina va adeguata).

### E. Admin quiz: paginazione server-side (impatto: massimo sul payload, sforzo: ~3 h)

Obiettivo: **8,79 MB → ~50 KB**. Tre mosse:

1. **Lista senza corpo pesante.** Una vista (o un `select` esplicito) che restituisce solo i campi di lista con l'anteprima:
   ```sql
   create or replace view public.admin_question_list as
   select id, source_id, topic, difficulty,
          left(question, 160) as preview_plain,
          created_at
   from public.questions;
   ```
   L'anteprima HTML va comunque resa sicura (esiste già `sanitizeHtml` in `src/lib/utils.ts`).
2. **Paginazione e filtri in PostgREST**, non nel browser:
   ```ts
   admin.from("admin_question_list")
     .select("*", { count: "estimated" })
     .order("topic").order("source_id")
     .range(page * 25, page * 25 + 24);
   ```
   Ricerca: `.or(\`preview_plain.ilike.%${q}%,topic.ilike.%${q}%,source_id.ilike.%${q}%\`)` (con l'indice trigram di §C). Filtri difficoltà/argomento con `.eq`.
   *Nota:* `.or()` con input utente va sanificato (virgole/parentesi) per non rompere la sintassi PostgREST.
3. **Dettaglio on demand.** Quando l'admin apre una domanda, una seconda query carica `question, options, answer_index, explanation` di **quella sola** riga.

Lo stato della pagina diventa `page`, `query`, `topic`, `difficulty` nei search param (già supportati da `next/navigation`), così il refresh e il link condivisibile funzionano.

### F. Admin utenti: togliere `listUsers` e i conteggi in JS (impatto: alto, sforzo: ~3-4 h)

1. **Email nei profili** (una volta): colonna + trigger, per non interrogare l'Auth API in loop.
   ```sql
   alter table public.profiles add column if not exists email text;

   create or replace function public.handle_new_user()  -- estende la versione esistente
   returns trigger language plpgsql security definer set search_path = '' as $$
   begin
     insert into public.profiles (id, email, display_name, accepted_terms_at,
                                  marketing_consent, status, year, school, city)
     values (new.id, new.email, /* …come oggi… */)
     on conflict (id) do update set email = excluded.email;
     return new;
   end $$;

   -- backfill una tantum
   update public.profiles p set email = u.email
   from auth.users u where u.id = p.id and p.email is distinct from u.email;
   ```
   *(Le email sono dati personali: restano protette dalla RLS dei profili — solo il proprietario le legge — e accessibili agli admin solo via service-role.)*
2. **Conteggi tentativi in SQL** invece di scaricare tutta `quiz_attempts`:
   ```sql
   create or replace view public.user_attempt_counts as
   select user_id,
          count(*)::int as attempts,
          max(completed_at) as last_attempt
   from public.quiz_attempts
   group by user_id;
   ```
3. **Lista paginata lato server**: `profiles` con `.range(0,24)`, `count: "estimated"`, ricerca `.ilike("display_name", ...)`/`.ilike("email", ...)`, filtro `.eq("status", ...)`, ordinamento `.order("created_at", { ascending: false })`; i conteggi in join con `user_attempt_counts` (o una seconda query `.in("user_id", ids)` limitata a 25 righe).

Risultato: da ~20 chiamate Auth + 2 scan completi + filtro nel browser a **2-3 query piccole**, con paginazione e ricerca vere.

### G. Quiz: indici, lotti più grandi, esclusione più leggera (impatto: medio, sforzo: ~2 h)

1. Indici di §C (fondamentale: oggi ogni lotto filtrato è un seq scan da 8,79 MB).
2. `EXERCISE_BATCH_SIZE` 10 → **20** (`src/lib/constants.ts:32`): dimezza i round trip del prefetch (`quiz-client.tsx` ne fa uno ogni ~7 risposte).
3. `p_exclude`: non inviare fino a 5000 UUID. Due opzioni:
   - **semplice:** inviare solo gli id del lotto in memoria (≤ 20-40) — rivedere di rado una domanda dopo 500 risposte è accettabile;
   - **elegante:** passare l'inizio sessione e filtrare in SQL sulle domande già risposte da allora:
     ```sql
     and not exists (
       select 1 from public.question_progress qp2
       where qp2.user_id = (select auth.uid())
         and qp2.question_id = q.id
         and qp2.answered_at >= p_since
     )
     ```
     eliminando del tutto l'array dal payload.
4. Il fallback di `src/lib/questions.ts:82-152` (count esatto + 3 × 800 righe) va attivato **solo** se la RPC non esiste (`PGRST202`), non su qualunque errore.

### H. Autenticazione: una sola verifica per richiesta (impatto: medio, sforzo: ~1 h)

- Nel proxy (`src/lib/supabase/proxy.ts:54-56`) usare `supabase.auth.getClaims()`: con chiavi di firma asimmetriche (progetto Supabase recente) la verifica avviene **in locale** con JWKS in cache, zero round trip. Se il progetto usa ancora JWT HS256 simmetrici, attivare le nuove chiavi asimmetriche in Supabase (Auth → JWT Signing Keys) oppure tenere `getUser()` solo dove serve davvero.
- Le pagine continuano a usare `getCurrentUser()` (già deduplicato da React `cache()`): il risultato è **1 sola chiamata di rete** nel caso peggiore per navigazione, invece di 2.

### I. Osservabilità (impatto: alto nel medio periodo, sforzo: ~2 h)

Senza misure, le ottimizzazioni successive si fanno alla cieca:

1. **`pg_stat_statements`** (già disponibile in Supabase) + report *Query Performance* del dashboard Supabase: ordina per `total_exec_time` e controlla i `rows` medi. Le query da cercare sono quelle con `rows ≈ 12000`.
2. **`EXPLAIN (ANALYZE, BUFFERS)`** delle tre query chiave (`get_quiz_questions` con filtri, `get_user_stats`, `get_admin_overview`): verificare `Index Scan` al posto di `Seq Scan`.
3. **Log di durata lato app**: wrappare le chiamate in un helper che misura e logga `route + query + ms + righe` (in dev basta `console.time`; in produzione un log strutturato). Con Vercel è il modo più rapido per capire *quale* delle N query domina.
4. **`next build`**: con Cache Components l'output indica le rotte in parte statiche ("◐"); dopo §B dovrebbe comparire almeno un aggregato statico/cachato.

---

## 6. Piano a fasi

| Fase | Interventi | Impatto | Sforzo | Rischio |
|---|---|---|---|---|
| **1. Vittorie immediate** | §C indici · §A `get_user_stats` · RLS `question_progress` in `schema.sql` | Dashboard/statistiche: **-95% byte, -90% richieste** | ~mezza giornata | basso (additivo) |
| **2. Quiz** | §G lotti 20 + esclusione leggera + fallback selettivo · §B catalogo in cache | `/quiz` più reattivo, meno CPU DB | ~mezza giornata | basso |
| **3. Admin** | §D `get_admin_overview` · §E paginazione quiz · §F utenti | `/admin/*` da multi-MB a decine di KB | ~1,5-2 giornate | medio (riscrittura di logica di aggregazione: serve confrontare i numeri prima/dopo) |
| **4. Rifinitura** | §H `getClaims` · §I osservabilità · (opzionale) materialized view + `pg_cron` | latenza per navigazione, capacità di monitorare | ~mezza giornata | basso |

**Verifica di ogni fase:** confrontare i numeri della pagina *prima* e *dopo* (KPI admin, percentuali dashboard, argomento migliore/peggiore) — le aggregazioni riscritte in SQL devono produrre gli **stessi valori** di quelle in JS. Le fasi 3 e 4 richiedono il tuo accesso a Supabase per applicare le migrazioni e confermare i totali.

Ordine consigliato: **Fase 1 subito** (mezza giornata, dimezza il problema più visibile), poi Fase 3 (l'admin è la parte che pesa di più in assoluto), quindi 2 e 4.

### Stato dell'implementazione

- **Fase 1 — fatto (16 ottobre 2026).**
  - `supabase/migrations/2026-10-16_indici-e-statistiche-utente.sql`: 6 indici, RLS su `question_progress`, funzione `get_user_stats()`.
  - `supabase/schema.sql` allineato (indici, RLS, funzione) per le installazioni da zero.
  - `src/lib/user-stats.ts`: percorso principale via RPC, con **ricaduta automatica** sul percorso storico se la funzione non è ancora stata applicata al database (nessun disservizio prima della migrazione).
  - Verifiche: `npm run lint` e `next build` puliti; test di parità fra percorso RPC e percorso storico (totali, copertura, best/worst, tentativi, casi limite) con esito identico.
  - **Azione richiesta:** eseguire la migrazione nell'SQL Editor di Supabase. Dopo la migrazione, confrontare i numeri di dashboard e statistiche con quelli precedenti.
- **Fase 3 — fatto (16 ottobre 2026).**
  - `supabase/migrations/2026-10-16_elenchi-admin.sql`: `profiles.email` (trigger di registrazione, backfill e sincronizzazione quando l'email cambia), viste `user_attempt_counts`, `question_topic_counts` e `admin_question_list`.
  - `supabase/migrations/2026-10-16_panoramica-admin.sql`: funzione `get_admin_overview()`.
  - `src/app/(app)/admin/overview-content.tsx`: una sola RPC al posto di tre scansioni complete (profili, tentativi, tutte le risposte).
  - `src/app/(app)/admin/quiz/*`: filtro, ricerca (sul testo senza tag HTML), conteggio e paginazione lato server: da 8,79 MB per apertura a **~18 KB** (20 domande complete).
  - `src/app/(app)/admin/utenti/*`: paginazione lato server (25 utenti), ricerca su nome/email/città/scuola nel database, esercitazioni per utente dalla vista invece di scaricare tutti i tentativi.
  - `src/app/(app)/admin/utenti/[id]/admin-user-detail.tsx`: le 5 letture in parallelo invece che in sequenza; conteggio domande per argomento dalla vista (19 righe) invece della tabella intera.
  - Tutti i percorsi hanno una **ricaduta** sul comportamento precedente se la migrazione non è ancora applicata (viste assenti, colonna `email` assente).
  - Verifiche: `npm run lint` e `next build` puliti; test di parità fra la vecchia aggregazione JS e la funzione SQL su dati sintetici (KPI, status, anno, città e scuole top 8, attività a 14 giorni, fasce di punteggio, precisione per argomento) con esito identico.
  - **Azione richiesta:** eseguire le due migrazioni nell'SQL Editor. Unica differenza nota: i tentativi di un utente **senza** riga di profilo (caso che non dovrebbe verificarsi: il profilo nasce con l'account) compaiono nei totali ma non nelle ripartizioni per status/anno.
- **Fase 2 — fatto (16 ottobre 2026).**
  - `src/lib/catalog.ts`: catalogo argomenti con le domande disponibili, letto dalla vista `question_topic_counts` (19 righe invece di 12.449) e memorizzato da Next (`"use cache"`, `cacheLife("hours")`, tag `questions`). Le azioni admin che scrivono su `questions` chiamano `updateTag("questions")`, così l'admin vede subito i propri cambiamenti. Usano il catalogo `/admin/quiz` (filtro argomenti) e il dettaglio utente (domande disponibili per argomento).
  - `EXERCISE_BATCH_SIZE` 10 → 20 (`src/lib/constants.ts`): metà dei round trip di precaricamento. Nessuna modifica all'interfaccia: l'esercitazione mostra sempre una domanda alla volta.
  - **Ricaduta selettiva.** `fetchQuestionBatch` (`src/lib/questions.ts`) e `loadUserStats` (`src/lib/user-stats.ts`) usano il percorso storico *solo* se la RPC risulta assente dal database (`isMissingFunctionError` in `src/lib/supabase/schema-compat.ts`: `PGRST202`/`PGRST203`/`42883`/`42P01`, o messaggio "Could not find the function…"). Su un errore transitorio (timeout, 5xx) la ricaduta non scatta più: moltiplicherebbe il carico proprio quando il database è in difficoltà. In quel caso la dashboard mostra lo stato di errore e la lettura resta nei log.
  - **`p_exclude` non modificato** (valutato e scartato con motivo misurato). L'array contiene gli id delle domande già mostrate nella sessione: ~36 byte l'una, quindi 1-2 KB nell'uso normale (un'esercitazione tipica è 10-40 domande). Le due alternative del report sono peggiori del problema: inviare solo il lotto corrente, o filtrare in SQL per `p_since` (inizio sessione), ripropone domande che il client scarta comunque (`fresh`), e con pool ristretti un lotto interamente di doppioni farebbe terminare l'esercitazione in anticipo. Da rivedere solo se una sessione arriva a centinaia di domande.
  - Verifiche: `npm run lint`, `npx tsc --noEmit` e `next build` (28 rotte) puliti; prova **dal vivo sul database del progetto** (dove le RPC non esistono ancora): `fetchQuestionBatch` restituisce 5 domande reali dal percorso storico e `loadUserStats` i totali corretti senza `hasError`; un timeout simulato *non* fa scattare la ricaduta; test di parità RPC/storico ancora verde; la funzione in cache risponde 19 argomenti e le chiamate successive non toccano il database.
- **Fase 4 — fatto (16 ottobre 2026).**
  - `src/lib/supabase/proxy.ts`: `getClaims()` al posto di `getUser()`. Con chiavi di firma asimmetriche la firma del JWT viene verificata in locale con le chiavi pubbliche (JWKS in cache di processo): una chiamata di rete in meno per ogni navigazione. Se il progetto usa ancora JWT simmetrici (HS256), `getClaims()` ricade internamente su `getUser()` e il comportamento resta identico a prima. In entrambi i casi la sessione scaduta viene rinnovata prima della verifica e i cookie aggiornati vengono riscritti nella risposta. Se la verifica non è disponibile (rete o JWKS irraggiungibile) i redirect non vengono applicati: un guasto momentaneo non deve mandare al login chi è già connesso.
  - `src/lib/perf.ts`: misure di durata con una riga per lettura (durata, righe, codice di errore) su `get_user_stats`, `get_quiz_questions`, `get_admin_overview`, `question_topic_counts`, elenchi admin e dettaglio utente. Sempre attive in sviluppo; in produzione si accendono con `PERF_LOG=1` per non riempire i log.
  - Materialized view + `pg_cron`: **non fatta** (voce opzionale). Le aggregazioni pesanti sono già dentro il database e quelle ripetute a ogni page view sono in cache Next: un dato non in tempo reale non vale il vantaggio residuo.
  - Verifiche: build pulita; sul server di sviluppo le rotte protette rispondono `307` verso `/login?next=…` (proxy 4-11 ms) e il catalogo risulta servito dalla cache.
- **Nota sul database del progetto (16 ottobre 2026).** Un controllo diretto (solo letture) mostra che il database di produzione è **indietro rispetto a `supabase/schema.sql`**:

  | Oggetto | Stato |
  | --- | --- |
  | `profiles.email`, viste `user_attempt_counts` / `question_topic_counts` / `admin_question_list` | presenti |
  | `profiles.year`, `profiles.tags` | **assenti** |
  | tabella `question_progress` | **assente** |
  | `get_quiz_questions` (firma a 5 parametri) | **assente** (esiste una versione vecchia a 4 parametri) |
  | `get_user_stats`, `get_admin_overview` | **assenti** |

  Conseguenza: oggi il sito funziona interamente sui percorsi di ricaduta (quiz e dashboard leggono le tabelle; `/admin` invita ad applicare la migrazione). Le due migrazioni `2026-10-16_indici-e-statistiche-utente.sql` e `2026-10-16_panoramica-admin.sql` **non possono essere applicate** finché mancano il loro prerequisito: falliscono con `relation "public.question_progress" does not exist` e `column "year" does not exist`. La via corretta è eseguire per intero **`supabase/schema.sql`** (idempotente: crea la tabella mancante, aggiunge le colonne, ricrea funzioni e viste e include tutte e tre le migrazioni del 16/10). Dopo di che le tre migrazioni diventano superflue.

---

## 7. Cosa *non* è un problema (per non ottimizzare a vuoto)

- **Connection pooling.** L'app non apre mai connessioni dirette a Postgres: usa `supabase-js` via HTTPS → PostgREST, che gestisce lui il pool. Non serve Supavisor né cambiare stringhe di connessione.
- **`save_quiz_attempt`** (`schema.sql:283-378`): è già una singola RPC atomica che calcola il punteggio in SQL e fa un solo `insert ... on conflict` per i progressi. Modello da imitare, non da toccare.
- **Policy RLS.** Sono scritte bene: usano `(select auth.uid())` invece di `auth.uid()`, quindi l'ottimizzatore le valuta una volta sola (initplan) e non per riga. La policy su `quiz_answers` usa un `EXISTS` per riga ma è un lookup sull'indice PK di `quiz_attempts`.
- **`order by random()` in sé.** Su 12k righe è ~10-25 ms: con gli indici di §C e lotti da 20 è accettabile. Non serve (ancora) una strategia di campionamento precalcolato.
- **Il middleware in sé.** Il proxy fa il lavoro giusto (refresh della sessione); il costo è solo la chiamata `getUser()` di rete, risolvibile con §H.

---

## 8. Appendice — inventario delle chiamate (riferimenti)

| File | Righe | Cosa fa | Problema |
|---|---|---|---|
| `src/lib/supabase/paginate.ts` | 17-25 | paginazione 1000/riga **sequenziale** | P2 |
| `src/lib/user-stats.ts` | 21-34 | `question_progress` (o `quiz_answers`) completo dell'utente | P1, P9 |
| `src/lib/user-stats.ts` | 66-73 | 500 tentativi (mai tutti) | troncamento silenzioso |
| `src/lib/user-stats.ts` | 75-80 | **tutte** le righe `questions.topic` | P1, P2, P3 |
| `src/app/(app)/dashboard/dashboard-content.tsx` | 95-102 | profilo + `loadUserStats` in parallelo | — |
| `src/app/(app)/statistiche/statistiche-content.tsx` | 24-26 | `loadUserStats` (duplicato del dashboard) | P3 |
| `src/lib/questions.ts` | 70-76 | RPC `get_quiz_questions` (percorso buono) | P6 (indici) |
| `src/lib/questions.ts` | 82-152 | fallback: count esatto + 3 × 800 righe full-column | P8, P9 |
| `src/app/(app)/quiz/actions.ts` | 117-130 | `exclude` fino a 5000 UUID nel body | P6 |
| `src/app/(app)/quiz/quiz-client.tsx` | 126-179 | prefetch ogni ~7 risposte (lotto da 10) | §G |
| `src/app/(app)/admin/overview-content.tsx` | 77-91 | 3 scan completi (`profiles`, `quiz_attempts`, `quiz_answers`) | P1, P7 |
| `src/app/(app)/admin/overview-content.tsx` | 193-207 | 14 × `attempts.filter()` (O(14n)) | P1 |
| `src/app/(app)/admin/quiz/quiz-content.tsx` | 12-20 | **tutte** le domande con HTML/opzioni/spiegazione | P5, P8 |
| `src/app/(app)/admin/quiz/quiz-manager.tsx` | 40, 63-80 | filtro/paginazione nel browser | P5 |
| `src/app/(app)/admin/utenti/admin-users-content.tsx` | 31-54 | `listUsers` fino a 20 chiamate Auth | P5 |
| `src/app/(app)/admin/utenti/admin-users-content.tsx` | 94-100 | tutta `quiz_attempts.user_id` per contare | P1, P5 |
| `src/app/(app)/admin/utenti/[id]/admin-user-detail.tsx` | 67-138 | 5 round trip in serie, incluso un altro scan di `questions.topic` | P1, P2 |
| `src/lib/supabase/proxy.ts` | 54-56 | `getUser()` su ogni richiesta | P4 |
| `src/app/api/account/export/route.ts` | 17-32 | export senza limiti con join profondi | ok (on-demand) |
| `supabase/schema.sql` | 90-103, 257-274 | `question_progress`: policy presenti ma **RLS non abilitata** | §4 |

---

## 9. Riepilogo: le 6 modifiche che spostano l'ago

1. `get_user_stats()` RPC → dashboard e statistiche in 1 richiesta. **-95% byte.**
2. Indici su `questions(topic, difficulty)` e `quiz_attempts(completed_at)` → via i seq scan da 12k righe.
3. `"use cache"` + `cacheTag("questions")` sul catalogo argomenti → fine delle 13 pagine per page view.
4. `get_admin_overview()` RPC → l'admin smette di scaricare tutte le risposte di tutti.
5. Paginazione server-side per `/admin/quiz` e `/admin/utenti` → 8,8 MB diventano ~50 KB per apertura.
6. `getClaims()` nel proxy → una sola verifica di autenticazione per navigazione.

Con questi sei interventi il sito passa da "regge decine di utenti" a "regge centinaia di utenti concorrenti sullo stesso piano Supabase", perché il carico per page view scende di circa **due ordini di grandezza** sia in byte sia in round trip.
