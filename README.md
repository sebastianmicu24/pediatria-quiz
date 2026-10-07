# Quiz Pediatria

Piattaforma web per allenarsi con **quiz di pediatria**: domande con spiegazioni, filtri per argomento e difficoltà, statistiche personali. Registrazione con email e password, nessun tracciamento, conformità GDPR.

## Stack

| Componente | Tecnologia |
| --- | --- |
| Frontend / SSR | [Next.js 16](https://nextjs.org) (App Router, Cache Components, Turbopack) |
| Database + Auth | [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, email/password) |
| Email transazionali | [Resend](https://resend.com) via SMTP personalizzato di Supabase |
| Hosting | [Vercel](https://vercel.com) |

## Funzionalità

- **Registrazione e accesso** con email e password; conferma email e recupero password con link sicuri.
- **Quiz configurabili**: filtra per argomento (18) e difficoltà (Base / Intermedia / Avanzata), scegli quante domande (10–50), estrazione casuale.
- **Feedback immediato** con spiegazione della risposta e revisione finale degli errori.
- **Statistiche personali**: precisione complessiva, prestazioni per argomento, storico dei quiz. Il punteggio è ricalcolato server-side: non falsificabile dal client.
- **Privacy by design**: solo cookie tecnici, nessun analytics, esportazione dei dati in JSON ed eliminazione definitiva dell'account self-service.
- **Pagine legali** complete: Privacy Policy, Cookie Policy e Termini di servizio (GDPR + normativa italiana).

## Struttura del progetto

```
├─ data/
│  └─ questions.json          # Domande generate da train.jsonl (297 quiz)
├─ docs/
│  ├─ SETUP.md                # Guida dettagliata: Supabase, Resend, Vercel
│  └─ email-templates-it.md   # Template email italiani per Supabase Auth
├─ scripts/
│  ├─ generate-data.mjs       # Converte train.jsonl → data/questions.json
│  └─ import-questions.mjs    # Importa/semeina le domande su Supabase
├─ supabase/
│  └─ schema.sql              # Tabelle, RLS, trigger e RPC di salvataggio
└─ src/
   ├─ app/                    # Rotte (pubbliche, auth, dashboard, quiz, account, API)
   ├─ components/             # UI riutilizzabile
   ├─ lib/                    # Client Supabase, auth, utility, dati legali
   └─ proxy.ts                # Sessione Supabase + protezione rotte (ex middleware)
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

# 4. Importa le 297 domande
npm run import:questions

# 5. Avvia
npm run dev
```

Guida completa con schermate dei passaggi e configurazione email/Vercel: **[docs/SETUP.md](docs/SETUP.md)**.

## Comandi disponibili

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il server di sviluppo su http://localhost:3000 |
| `npm run build` | Build di produzione |
| `npm run lint` | Analisi ESLint |
| `npm run generate:data` | Rigenera `data/questions.json` da `train.jsonl` |
| `npm run import:questions` | Importa le domande su Supabase (service role) |
| `node scripts/import-questions.mjs --print-sql > supabase/seed.sql` | Genera lo SQL di seed da incollare nell'SQL Editor |

## Variabili d'ambiente

Tutte le variabili sono documentate in [`.env.example`](.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — URL del progetto e **publishable key** (`sb_publishable_...`; accettata anche la legacy `anon`).
- `SUPABASE_SERVICE_ROLE_KEY` — **secret key** (`sb_secret_...`; accettata anche la legacy `service_role`). **Segreta**, usata solo lato server per l'eliminazione account. Su Vercel va aggiunta senza prefisso `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` — URL pubblico del sito (es. `https://quiz.example.it`).
- `NEXT_PUBLIC_LEGAL_OWNER`, `NEXT_PUBLIC_LEGAL_EMAIL`, `NEXT_PUBLIC_LEGAL_ADDRESS` — dati del titolare del trattamento mostrati nelle pagine legali.

> Trovi URL e chiavi nel dashboard Supabase: pulsante **Connect** oppure **Settings (⚙) → API Keys**. Dettagli in [`docs/SETUP.md`](docs/SETUP.md).

## Conformità normativa (GDPR e Italia)

- Basi giuridiche esplicitate (art. 6 GDPR); consensi registrati con data in fase di registrazione.
- Solo **cookie tecnici** (sessione di autenticazione): nessun banner di consenso richiesto, informativa presente.
- Elenco responsabili del trattamento (Supabase, Vercel, Resend) e informazioni sui trasferimenti extra-UE nella Privacy Policy.
- Diritti esercitabili self-service: **esportazione dati** (art. 20) ed **eliminazione account** (art. 17).
- Età minima 14 anni (art. 2-quinquies Codice Privacy) e avvertenza medica sui contenuti.

> **Nota**: i dati del Titolare in `src/lib/legal.ts` sono precompilati ma è responsabilità del gestore verificarne esattezza e aggiornare le pagine legali (es. indirizzo, eventuale P.IVA).

## Contenuti dei quiz

Le domande derivano da materiale di studio pediatrico e sono pensate per l'autovalutazione. **Non costituiscono consulenza medica**: fanno sempre fede le linee guida ufficiali e il giudizio del clinico. Se aggiorni il dataset, rigenera i dati con `npm run generate:data` e aggiorna i conteggi in `src/lib/constants.ts`.

## Licenza

Codice © Cristian Sebastian Micu — tutti i diritti riservati, salvo diversa indicazione.
