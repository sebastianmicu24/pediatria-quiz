# Sicurezza di Pediatroma — Report di audit

**Data:** 7 ottobre 2026 · **Ambito:** applicazione Next.js, database Supabase (RLS), API, configurazione di deploy.

Questo documento elenca le vulnerabilità individuate durante l'audit, lo stato delle correzioni e le raccomandazioni operative. L'obiettivo è rendere il sito robusto contro abusi di utenti mal intenzionati senza sacrificare l'esperienza d'uso.

---

## 1. Vulnerabilità corrette in questo aggiornamento

| # | Vulnerabilità | Gravità | Correzione |
| --- | --- | --- | --- |
| 1 | **Open redirect** tramite backslash nel parametro `next` (es. `/\evil.com`): dopo il login l'utente poteva essere dirottato su un sito esterno (phishing). | Media | `safeNextPath()` ora rifiuta percorsi che iniziano con `//`, contengono `\` o non sono relativi. |
| 2 | **Cookie di sessione senza flag `Secure`**: i cookie di autenticazione potevano viaggiare anche su HTTP in contesti non protetti. | Media | Tutti i client Supabase (browser, server, proxy) impostano `Secure` in produzione (`cookieOptions`). |
| 3 | **Header di sicurezza assenti**: niente protezione da clickjacking, sniffing dei contenuti o referrer leakage. | Bassa-Media | Aggiunti `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; rimosso `X-Powered-By`. HSTS è già fornito da Vercel. |
| 4 | **Profilo troppo modificabile via API**: un utente poteva alterare `accepted_terms_at` (data del consenso) e i timestamp di auditoria con una chiamata diretta al database. | Bassa | Migrazione: `UPDATE` a livello di colonna — l'utente può modificare solo `display_name`, `marketing_consent`, `status`, `school`, `city`. |
| 5 | **RPC tentativi senza limiti**: `save_quiz_attempt` accettava argomenti (`topic`) di lunghezza arbitraria e difficoltà fuori scala. | Bassa | Migrazione: `topic` limitato a 80 caratteri, difficoltà validata (1–3) + vincolo `CHECK` sulla tabella dei tentativi. |

Tutte le correzioni sono già incluse nel codice e in `supabase/migrations/2026-10-08_hardening-sicurezza.sql`.

---

## 2. Verificato e risultato solido

### Autenticazione e sessioni
- ✅ **Login bloccato per utenti non confermati** (test automatico in `npm run smoke`: errore `email_not_confirmed`).
- ✅ Rate limit di Supabase Auth attivi (protezione da brute force e spam email, di default).
- ✅ Recupero password e conferma email con token monouso a scadenza.
- ✅ Sessioni gestite con cookie `SameSite=Lax` + `HttpOnly=false` (necessario per il refresh client) + `Secure` in produzione.

### Autorizzazione
- ✅ **RLS attiva su tutte le tabelle** con policy "solo i propri dati" per profili, tentativi e risposte.
- ✅ Le domande sono **leggibili ma non modificabili** dagli utenti; la scrittura avviene solo tramite ruoli di servizio (admin) o funzioni controllate.
- ✅ Il **punteggio dei quiz è calcolato dal database**: impossibile falsificarlo dal client.
- ✅ Pagine admin (`/statistiche`, `/admin`) protette da allowlist email (`ADMIN_EMAILS`) e restituiscono **404** agli utenti non autorizzati; ogni server action ricontrolla i permessi.
- ✅ Nessun IDOR: ogni risorsa è filtrata per utente autenticato (RLS + `requireUser`).

### Injection e XSS
- ✅ **XSS**: l'unico HTML renderizzato passa da un sanitizzatore ad allowlist (solo `p`, `strong`, `em`, `ul`, `ol`, `li`, `br`; nessun attributo). Applicato **due volte**: al salvataggio (editor admin) e al render.
- ✅ Tutti gli altri contenuti generati dall'utente (nome visualizzato, email) sono renderizzati come **testo** (React li scappa automaticamente).
- ✅ **SQL injection**: nessuna query concatenata; accesso al database esclusivamente tramite `supabase-js` (query parametrizzate) e funzioni RPC tipizzate.

### Web e browser
- ✅ **CSRF**: cookie `SameSite=Lax`, controllo `Origin` sulla route distruttiva di eliminazione account e protezione nativa delle Server Actions di Next.js.
- ✅ **Tabnabbing**: tutti i link esterni hanno `rel="noopener noreferrer"`.
- ✅ **Clickjacking**: header `X-Frame-Options` + `frame-ancestors` (vedi tabella sopra).
- ✅ Gestione errori senza fughe di informazione (nessun dettaglio interno esposto agli utenti).

### Segreti e dipendenze
- ✅ La **service key Supabase è usata solo lato server** (verificato: nessun componente client la importa). `.env.local` è in `.gitignore` e nel repository non sono mai stati committati segreti.
- ✅ `npm audit`: le unicità rilevate (5 "high") sono **solo nella toolchain di sviluppo** (ESLint/Next plugin, `fast-glob`), non finiscono nel bundle di produzione. Da monitorare con i prossimi aggiornamenti di Next.js.

---

## 3. Azioni consigliate nei dashboard (a carico del gestore)

1. **Supabase → Authentication**:
   - Password policy: lunghezza minima **8** (allineata al form di registrazione).
   - Mantieni attiva la **Email Enumeration Protection** (la registrazione con email esistente non genera errori diversi).
   - Esegui periodicamente **Database → Advisors → Security**: segnala tabelle senza RLS o configurazioni deboli.
   - Valuta l'attivazione dei **backup** (piano a pagamento) prima del lancio pubblico.
2. **Vercel**:
   - Durante l'alfa, valuta **Settings → Deployment Protection** (Vercel Authentication / Password) per limitare l'accesso al sito.
   - Controlla che le variabili d'ambiente siano impostate solo negli ambienti giusti (Production/Preview), mai in Git.
3. **Resend / DNS**:
   - Mantieni corretti i record **SPF e DKIM** del dominio: proteggono dalla spoofing delle email di Pediatroma.
4. **Operativo**:
   - Non condividere mai la **secret key**; in caso di sospetta compromissione, ruotala immediatamente (Settings → API Keys).
   - Usa un password manager per il Titolare e per gli account admin.

---

## 4. Raccomandazioni future (non critiche)

| Tema | Nota |
| --- | --- |
| Content-Security-Policy completa | Oggi è attivo solo `frame-ancestors`. Una CSP completa richiede nonce sugli script inline di Next.js: lavoro pianificabile dopo la fase alfa. |
| Rate limiting applicativo | Supabase limita l'API, ma si può aggiungere un limite dedicato (es. Upstash Redis) su export dati e azioni admin se l'uso cresce. |
| 2FA per gli admin | Supabase supporta MFA: da attivare per gli account in `ADMIN_EMAILS` prima di un lancio con più amministratori. |
| Audit log | Registrare le azioni admin (chi modifica/elimina una domanda e quando), utile per la tracciabilità. |
| Monitoraggio | Integrare un servizio di error tracking (es. Sentry) per accorgersi di anomalie in tempo reale. |
| Test ricorrenti | Eseguire `npm run smoke` dopo ogni migrazione e ripetere `npm audit` a ogni aggiornamento delle dipendenze. |
