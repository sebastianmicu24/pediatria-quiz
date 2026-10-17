# Sicurezza di pediatro.me — Report di audit

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
- ✅ **XSS**: l'unico HTML renderizzato passa da un sanitizzatore ad allowlist (tag di formattazione: `p`, `strong`, `em`, `b`, `i`, `u`, `s`, `span`, `ul`, `ol`, `li`, `br`, `img`; su `<span>` solo stili sicuri — colore, sfondo, dimensione, font; niente script, link, SVG o data URL). Applicato **due volte**: al salvataggio (editor admin) e al render.
- ✅ **Immagini dei quiz**: caricate solo dagli admin dal server (service role) nel bucket pubblico `quiz-images`; il sanitizzatore accetta esclusivamente URL di quel bucket (PNG/JPG/WebP fino a 5 MB, niente SVG). Upload validati per tipo, dimensione ed estensione generata dal server.
- ✅ Tutti gli altri contenuti generati dall'utente (nome visualizzato, email) sono renderizzati come **testo** (React li scappa automaticamente).
- ✅ **SQL injection**: nessuna query concatenata; accesso al database esclusivamente tramite `supabase-js` (query parametrizzate) e funzioni RPC tipizzate.

### Blog (aggiunto il 17 ottobre 2026)
- ✅ **Scrittura solo admin**: la tabella `blog_posts` non ha permessi di scrittura per `anon`/`authenticated`; creare, modificare, pubblicare ed eliminare passa da Server Action che ricontrollano `ADMIN_EMAILS` e scrivono con la chiave di servizio solo i campi previsti (niente mass assignment).
- ✅ **Lettura**: RLS attiva, gli utenti autenticati leggono solo gli articoli `published` e solo le colonne elencate nel `GRANT` (non `author_id`). Le bozze le vede solo l'admin, via chiave di servizio dopo il controllo.
- ✅ **XSS**: il testo degli articoli usa il profilo `"blog"` del sanitizzatore (titoli, citazioni, tabelle, apici/pedici, link), applicato al salvataggio e al render. I link ammettono solo percorsi interni, `http(s)` (senza credenziali nell'URL), `mailto` e `tel`; `javascript:`, `data:`, `vbscript:`, `//host` e backslash sono rifiutati e i link esterni ricevono `rel="noopener noreferrer nofollow"`. Nessuna immagine esterna o SVG.
- ✅ **Pulsanti nelle spiegazioni dei quiz**: nel profilo `"quiz"` l'unico `<a>` ammesso è `<a href="/blog/<slug>" data-blog-button="true">`; ogni altro link viene ridotto a testo. Il pulsante si apre in una nuova scheda.
- ✅ **Upload immagini**: stesso bucket e limiti dei quiz (PNG/JPG/WebP, 5 MB), ora con controllo dei primi byte del file oltre al tipo dichiarato; il nome del file è generato dal server.
- ✅ **Validazione anche nel database**: formato dello slug, lunghezze e coerenza `published`/`published_at` sono vincoli `CHECK`. Slug e id sono validati prima di ogni interrogazione.
- ✅ **Slug bloccato dopo la prima pubblicazione**, così i link già presenti nei quiz non si rompono.
- Test: `npm run test:sanitize` copre anche i vettori di attacco sui link e sui profili.

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
   - Mantieni corretti i record **SPF e DKIM** del dominio: proteggono dalla spoofing delle email di pediatro.me.
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
