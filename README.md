# pediatro.me

**Quiz per un domani più grande.** Piattaforma web per allenarsi con quiz di pediatria: domande con spiegazioni, filtri per argomento e difficoltà, statistiche personali e un pannello riservato con gli esiti aggregati degli studenti.

## Stack

| Componente | Tecnologia |
| --- | --- |
| Frontend / SSR | [Next.js 16](https://nextjs.org) (App Router, Cache Components, Turbopack) |
| Database + Auth | [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, email/password) |
| Email transazionali | [Resend](https://resend.com) via SMTP personalizzato di Supabase |
| Hosting | [Vercel](https://vercel.com) |

## Funzionalità

- **Registrazione e accesso** con email e password; conferma email, recupero password e reinvio del link di conferma.
- **Quiz configurabili**: filtra per argomento (18) e difficoltà (Base / Intermedia / Avanzata), scegli quante domande (10–50), estrazione casuale.
- **Feedback immediato** con spiegazione della risposta e revisione finale degli errori.
- **Statistiche personali** su `/statistiche`: precisione complessiva, prestazioni per argomento, storico dei quiz. Il punteggio è ricalcolato server-side: non falsificabile dal client.
- **Pannello admin** su `/admin` (panoramica): esiti aggregati e anonimi per status (studente/specializzando/professionista), città e scuola, attività giornaliera e precisione per argomento. Schede utente su `/admin/utenti`. Accesso tramite allowlist `ADMIN_EMAILS`.
- **Gestione quiz (admin)** su `/admin/quiz`: ricerca, modifica con editor formattato (grassetto, corsivo, elenchi) ed eliminazione delle domande, con validazione e sanitizzazione lato server.
- **Profilo con dati facoltativi**: status, città e scuola di provenienza — modificabili e rimovibili in ogni momento, usati solo per statistiche aggregate.
- **Privacy by design**: solo cookie tecnici, nessun analytics, esportazione dei dati in JSON ed eliminazione definitiva dell'account self-service.
- **Pagine legali complete**: Privacy Policy, Cookie Policy e Termini di servizio (GDPR + normativa italiana).

## Struttura del progetto

```
├─ data/
│  └─ questions.json                 # Domande generate dai file .jsonl del dataset (oltre 12.000 quiz)
├─ docs/
│  ├─ SETUP.md                       # Guida dettagliata: Supabase, Resend, Vercel
│  ├─ SICUREZZA.md                   # Report di audit e raccomandazioni
│  └─ email-templates-it.md          # Template email italiani per Supabase Auth
├─ scripts/
│  ├─ generate-data.mjs              # Unisce i file .jsonl (train/test/extra) → data/questions.json
│  ├─ import-questions.mjs           # Importa/semeina le domande su Supabase
│  └─ smoke-test.mjs                 # Verifica end-to-end della configurazione
├─ supabase/
│  ├─ schema.sql                     # Tabelle, RLS, trigger e RPC (idempotente)
│  └─ migrations/                    # Migrazioni incrementali da applicare sull'SQL Editor
└─ src/
   ├─ app/                           # Rotte, divise in gruppi: (marketing), (auth), (app) = area riservata, api
   │  └─ (app)/                      #   dashboard, quiz, statistiche, account, admin, turni*, strumenti*  (*in arrivo)
   ├─ components/                    # UI riutilizzabile: ui/ (design system), shell/ (navigazione), site/ (sito pubblico)
   ├─ lib/                           # Client Supabase, auth, admin, utility, dati legali
   │                                   navigation.ts (menu), tools.ts (registro strumenti), user-stats.ts
   └─ proxy.ts                       # Sessione Supabase + protezione rotte (ex middleware)
```

## Avvio rapido

Requisiti: **Node.js 20.9+** e un account [Supabase](https://supabase.com) (gratuito).

```bash
# 1. Installazione
npm install

# 2. Configurazione ambiente
copy .env.example .env.local     # macOS/Linux: cp .env.example .env.local
#    → compila i valori (vedi docs/SETUP.md, passo "Supabase")

# 3. Database: incolla supabase/schema.sql nell'SQL Editor di Supabase
#    (per database esistenti: supabase/migrations/*.sql)

# 4. Importa le domande (oltre 12.000)
npm run import:questions

# 5. Avvia
npm run dev
```

Guida completa con i passaggi nei dashboard e la configurazione di email, dominio e Vercel: **[docs/SETUP.md](docs/SETUP.md)**.

## Comandi disponibili

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il server di sviluppo su http://localhost:3000 |
| `npm run build` | Build di produzione |
| `npm run lint` | Analisi ESLint |
| `npm run generate:data` | Rigenera `data/questions.json` unendo i file `.jsonl` del dataset (train/test/extra) |
| `npm run import:questions` | Importa le domande su Supabase (service key) |
| `npm run smoke` | Verifica end-to-end la configurazione Supabase (crea ed elimina un utente di test) |
| `node scripts/import-questions.mjs --print-sql > supabase/seed.sql` | Genera lo SQL di seed da incollare nell'SQL Editor |

## Variabili d'ambiente

Tutte le variabili sono documentate in [`.env.example`](.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — URL del progetto e **publishable key** (`sb_publishable_...`; accettata anche la legacy `anon`).
- `SUPABASE_SERVICE_ROLE_KEY` — **secret key** (`sb_secret_...`; accettata anche la legacy `service_role`). **Segreta**, usata solo lato server (pannello statistiche, eliminazione account). Su Vercel va aggiunta senza prefisso `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` — URL pubblico del sito (es. `https://pediatro.me`).
- `NEXT_PUBLIC_LEGAL_OWNER`, `NEXT_PUBLIC_LEGAL_EMAIL`, `NEXT_PUBLIC_LEGAL_ADDRESS` — dati del titolare del trattamento mostrati nelle pagine legali.
- `ADMIN_EMAILS` — email separate da virgola abilitate a `/admin`.

> Trovi URL e chiavi nel dashboard Supabase: pulsante **Connect** oppure **Settings (⚙) → API Keys**. Dettagli in [`docs/SETUP.md`](docs/SETUP.md).

## Conformità normativa (GDPR e Italia)

- Basi giuridiche esplicitate (art. 6 GDPR); consensi registrati con data in fase di registrazione.
- Dati facoltativi del profilo (status, città, scuola) raccolti su consenso e usati **solo in forma aggregata**; modificabili e rimovibili dalla pagina Account.
- Solo **cookie tecnici** (sessione di autenticazione): nessun banner di consenso richiesto, informativa presente.
- Elenco responsabili del trattamento (Supabase, Vercel, Resend) e informazioni sui trasferimenti extra-UE nella Privacy Policy.
- Diritti esercitabili self-service: **esportazione dati** (art. 20) ed **eliminazione account** (art. 17).
- Età minima 14 anni (art. 2-quinquies Codice Privacy) e avvertenza medica sui contenuti.

Report di audit e raccomandazioni operative: **[docs/SICUREZZA.md](docs/SICUREZZA.md)** — RLS, sanitizzazione XSS, punteggi non falsificabili, header di sicurezza e gestione dei segreti.

> **Nota**: i dati del Titolare in `src/lib/legal.ts` sono precompilati ma è responsabilità del gestore verificarne esattezza e aggiornare le pagine legali (es. indirizzo, eventuale P.IVA).

## Contenuti dei quiz

Le domande derivano da materiale di studio pediatrico e sono pensate per l'autovalutazione. **Non costituiscono consulenza medica**: fanno sempre fede le linee guida ufficiali e il giudizio del clinico. Se aggiorni il dataset, rigenera i dati con `npm run generate:data` e aggiorna i conteggi in `src/lib/constants.ts`.

## Licenza

Codice © Cristian Sebastian Micu — tutti i diritti riservati, salvo diversa indicazione.

## Interfaccia e design system

Il piano di redesign e le scelte di stile sono in [`docs/REDESIGN.md`](docs/REDESIGN.md).

**Aggiungere una nuova sezione** all'area riservata (es. Turni, Strumenti):

1. Una voce in `src/lib/navigation.ts` (`status: "soon"` finché non è pronta, poi `"live"`).
2. La cartella `src/app/(app)/<sezione>/page.tsx`, con `<PageContainer>` + `<PageHeader>`.
3. Il prefisso in `PROTECTED_PREFIXES` di `src/lib/supabase/proxy.ts`.
4. Per gli strumenti: una voce in `src/lib/tools.ts` e la pagina in `src/app/(app)/strumenti/<slug>/`.