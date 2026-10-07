# Guida di configurazione

Questa guida copre la configurazione completa: **Supabase** (database + auth), **Resend** (SMTP per le email) e **Vercel** (hosting). Tempo stimato: 20–30 minuti.

---

## 1. Supabase

### 1.1 Crea il progetto

1. Vai su [supabase.com](https://supabase.com) → **Start your project** (piano gratuito).
2. Crea un'organizzazione e un progetto:
   - **Name**: `pediatria-quiz`
   - **Database Password**: scegline una robusta e conservala.
   - **Region**: **Central EU (Frankfurt)** o altra regione UE — importante per la conformità GDPR promessa nella Privacy Policy.

### 1.2 Applica lo schema del database

1. Nel dashboard Supabase, apri **SQL Editor** → **New query**.
2. Incolla il contenuto di `supabase/schema.sql` ed esegui (**Run**).
3. Verifica in **Table Editor** che siano presenti le tabelle: `profiles`, `questions`, `quiz_attempts`, `quiz_answers`.

Lo schema include: Row Level Security su tutte le tabelle, creazione automatica del profilo alla registrazione (con registrazione dei consensi) e la funzione RPC `save_quiz_attempt` (punteggio calcolato server-side).

### 1.3 Importa le domande

Il file `data/questions.json` è già incluso nel repository. Nel `.env.local` del tuo computer imposta almeno:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project Settings → API → service_role (SEGRETA)
```

Poi esegui:

```bash
npm run import:questions
```

Vedrai l'avanzamento in lotti da 100; al termine le 297 domande saranno in `public.questions`.

**Alternativa senza script** (es. da un'altra macchina):

```bash
node scripts/import-questions.mjs --print-sql > supabase/seed.sql
```

e incolla `supabase/seed.sql` nell'SQL Editor di Supabase.

### 1.4 Configura l'autenticazione

**Authentication → Sign In / Providers → Email**:

- Email provider: **enabled**.
- **Confirm email**: consigliato **attivo** (gli utenti confermano l'email al primo accesso).
- Minimum password length: **8**.

**Authentication → URL Configuration**:

- **Site URL**: l'URL di produzione, es. `https://tuodominio.it`
- **Redirect URLs** (una per riga):
  ```
  http://localhost:3000/**
  https://tuodominio.it/**
  https://*.vercel.app/**
  ```

**Authentication → Emails → SMTP Settings**: vedi la sezione [Resend](#2-resend) qui sotto.

**Authentication → Emails → Templates**: sostituisci i template con quelli italiani pronti in [`docs/email-templates-it.md`](email-templates-it.md). Sono già allineati al route handler `/auth/confirm` del progetto.

> **Nota**: se usi i template predefiniti (in inglese) il flusso funziona comunque grazie al fallback integrato (vedi `AuthHashHandler`), ma i template personalizzati offrono un'esperienza migliore e coerente col brand.

### 1.5 Recupera le chiavi API

**Project Settings → API**:

| Valore | Dove va |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` secret key | `SUPABASE_SERVICE_ROLE_KEY` (**solo server**, mai nel client) |

---

## 2. Resend

Supabase sul piano gratuito ha un limite molto basso di email/ora. Collegando **Resend** come SMTP personalizzato si inviano le email transazionali (conferma registrazione, recupero password) con il proprio dominio.

### 2.1 Crea l'account e la chiave API

1. Registrati su [resend.com](https://resend.com) (piano gratuito: 3.000 email/mese, 100/giorno).
2. **API Keys** → **Create API Key** → permesso **Sending access** → copia la chiave (`re_...`).

### 2.2 Verifica il dominio (consigliato)

1. **Domains** → **Add Domain** → inserisci il tuo dominio (es. `tuodominio.it`).
2. Aggiungi i record DNS indicati (SPF e DKIM) nel pannello del tuo provider.
3. Attendi la verifica (minuti/ore).

> **In alternativa (solo test)**: puoi inviare da `onboarding@resend.dev`, ma **solo verso l'indirizzo email con cui ti sei registrato su Resend**. Va bene per lo sviluppo, non per la produzione.

### 2.3 Configura SMTP in Supabase

**Authentication → Emails → SMTP Settings** → abilita **Enable Custom SMTP**:

| Campo | Valore |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la tua API key `re_...` |
| Sender email | es. `noreply@tuodominio.it` (dominio verificato) |
| Sender name | `Quiz Pediatria` |

Salva e usa il pulsante di invio email di test.

### 2.4 Imposta i template email

Sempre in **Authentication → Emails → Templates**, incolla i soggetti e i corpi HTML da [`docs/email-templates-it.md`](email-templates-it.md) per:

- **Confirm signup** (conferma registrazione)
- **Reset password** (recupero password)
- **Change email address** (cambio email)
- **Email address changed** (notifica cambio email)

---

## 3. Vercel

### 3.1 Collega il repository

1. Vai su [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Importa il repository GitHub `pediatria-quiz` (autorizza Vercel se richiesto).
3. Framework preset: **Next.js** (rilevato automaticamente). Non modificare i comandi di build.

### 3.2 Variabili d'ambiente

In **Settings → Environment Variables** aggiungi (per tutti gli ambienti, o almeno Production):

```
NEXT_PUBLIC_SUPABASE_URL       = https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...
SUPABASE_SERVICE_ROLE_KEY      = eyJ...   ← segreta
NEXT_PUBLIC_SITE_URL           = https://tuodominio.it
NEXT_PUBLIC_LEGAL_OWNER        = Cristian Sebastian Micu
NEXT_PUBLIC_LEGAL_EMAIL        = contact@sebastianmicu.com
```

> `SUPABASE_SERVICE_ROLE_KEY` serve solo alla route di eliminazione account: senza di essa tutto il resto funziona, ma il pulsante "Elimina account" restituirà un errore di configurazione.

### 3.3 Deploy e dominio

1. **Deploy**. Alla prima build Vercel rileverà Next.js 16.
2. Aggiungi il dominio custom in **Settings → Domains** (es. `tuodominio.it`).
3. Aggiorna su Supabase la **Site URL** e le **Redirect URLs** con il dominio definitivo.
4. Se cambi variabili d'ambiente, rifai il deploy (**Deployments → … → Redeploy**).

---

## 4. Checklist di collaudo

1. Apri il sito → **Registrati** con una email vera.
2. Ricevi l'email di conferma (mittente `Quiz Pediatria`) → clicca il link → vieni portato alla dashboard.
3. Esegui un quiz completo → verifica che la dashboard mostri statististiche aggiornate.
4. **Password dimenticata** → ricevi l'email → reimposta → accedi con la nuova password.
5. Pagina **Account** → scarica l'export JSON → prova l'eliminazione di un account di test.
6. Controlla la pagina `/privacy`, `/cookie` e `/termini` con i tuoi dati definitivi.

---

## Problemi comuni

| Sintomo | Causa probabile | Soluzione |
| --- | --- | --- |
| "Configurazione Supabase mancante" | `.env.local` incompleto | Compila `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, riavvia `npm run dev` |
| Le email non arrivano | SMTP non configurato o dominio non verificato | Controlla **Authentication → Emails** e i record DNS di Resend (anche cartella spam) |
| Dashboard dice "Database non inizializzato" | Schema non applicato | Esegui `supabase/schema.sql` nell'SQL Editor |
| Quiz vuoti "Nessuna domanda" | Domande non importate | Esegui `npm run import:questions` |
| Errore 500 su "Elimina account" | Manca la service role key | Aggiungi `SUPABASE_SERVICE_ROLE_KEY` su Vercel e ridai il deploy |
| Link email "non valido o scaduto" | Redirect URL non configurato o link già usato | Aggiorna le Redirect URLs su Supabase; i link sono monouso e scadono |
