# Template email in italiano (Supabase Auth)

Copia questi template in **Supabase → Authentication → Emails → Templates**.
Il parametro `{{ .SiteURL }}` è la **Site URL** configurata in Supabase (es. `https://pediatro.me`, senza slash finale). Il progetto gestisce questi link con la route `/auth/confirm`.

---

## 1. Conferma registrazione — *Confirm signup*

**Subject:**

```
Conferma la tua email per attivare l'account — Pediatroma
```

**Body (HTML):**

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:18px;font-weight:700;margin:0 0 24px">Pediatroma</p>
  <h1 style="font-size:20px;margin:0 0 12px">Conferma la tua email</h1>
  <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 24px">
    Benvenuto/a in Pediatroma! Clicca il pulsante qui sotto per attivare il tuo account e iniziare subito ad allenarti.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/dashboard"
       style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px">
      Conferma la mia email
    </a>
  </p>
  <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 8px">
    Il link è monouso e scade dopo 24 ore. Se non hai creato tu questo account, ignora questa email.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:0">
    Pediatroma — contenuti a scopo didattico, non sostituiscono il parere medico.
  </p>
</div>
```

---

## 2. Recupero password — *Reset password*

**Subject:**

```
Reimposta la password del tuo account — Pediatroma
```

**Body (HTML):**

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:18px;font-weight:700;margin:0 0 24px">Pediatroma</p>
  <h1 style="font-size:20px;margin:0 0 12px">Reimposta la password</h1>
  <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 24px">
    Abbiamo ricevuto una richiesta di reimpostazione della password per l'account associato a questo indirizzo email. Clicca il pulsante per scegliere una nuova password.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reimposta-password"
       style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px">
      Scegli una nuova password
    </a>
  </p>
  <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 8px">
    Se non hai richiesto tu il cambio password, puoi ignorare questa email: la password attuale resterà valida.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:0">
    Pediatroma — contenuti a scopo didattico, non sostituiscono il parere medico.
  </p>
</div>
```

---

## 3. Cambio email — *Change email address*

**Subject:**

```
Conferma il tuo nuovo indirizzo email — Pediatroma
```

**Body (HTML):**

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:18px;font-weight:700;margin:0 0 24px">Pediatroma</p>
  <h1 style="font-size:20px;margin:0 0 12px">Conferma il nuovo indirizzo email</h1>
  <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 24px">
    Hai chiesto di associare il nuovo indirizzo <strong>{{ .NewEmail }}</strong> al tuo account. Clicca il pulsante per confermare.
  </p>
  <p style="margin:0 0 24px">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/account"
       style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px">
      Conferma il nuovo indirizzo
    </a>
  </p>
  <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 8px">
    Se non hai richiesto tu questa modifica, ignora questa email.
  </p>
</div>
```

---

## 4. Notifica cambio email — *Email address changed*

**Subject:**

```
Il tuo indirizzo email è stato aggiornato — Pediatroma
```

**Body (HTML):**

```html
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
  <p style="font-size:18px;font-weight:700;margin:0 0 24px">Pediatroma</p>
  <h1 style="font-size:20px;margin:0 0 12px">Indirizzo email aggiornato</h1>
  <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 24px">
    Ti informiamo che l'indirizzo email del tuo account Pediatroma è stato modificato.
  </p>
  <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 8px">
    Se non riconosci questa modifica, contattaci immediatamente rispondendo a questa email.
  </p>
</div>
```

---

## Note importanti

- **Non modificare** la struttura dei link `/auth/confirm?token_hash=...&type=...&next=...`: è gestita da `src/app/auth/confirm/route.ts`.
- Se in futuro attivi i template predefiniti (non personalizzati), il progetto li supporta comunque tramite il fallback `AuthHashHandler` montato nel layout.
- Per cambiare il mittente: **Authentication → Emails → SMTP Settings → Sender name/email**.
- Le email di conferma e recupero vengono inviate ai fini dell'esecuzione del contratto; nessuna email promozionale viene inviata senza consenso esplicito (vedi Privacy Policy).
