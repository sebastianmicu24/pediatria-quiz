# src/content

Testi editoriali del sito, separati dai componenti che li mostrano.

Regola: **se un testo è contenuto (si modifica quando cambia il messaggio), sta
qui; se è impaginazione (cambia quando cambia il design), resta nel componente.**

## marketing.ts

Contenuto della landing page (`src/app/(marketing)/page.tsx`):

- `FAQ` — domande frequenti, `{ q, a }`;
- `FEATURES` — voci della sezione "Cosa trovi", `{ title, text }`;
- `STEPS` — passi della sezione "Come funziona", `{ title, text }`;
- `HERO_STATS` — numeri sotto il titolo (derivano da `QUIZ_STATS`);
- `PREVIEW_OPTIONS` — etichette dell'anteprima decorativa del quiz.

Per aggiungere una voce: aggiungi un elemento all'array. Per toglierla: rimuovila.
L'ordine visivo è l'ordine dell'array.

## legal/

Testo delle pagine legali, come componenti React (contengono link e valori
dinamici, quindi non sono semplici stringhe):

- `privacy.tsx` → `PrivacyPolicyContent`
- `termini.tsx` → `TermsContent`
- `cookie.tsx` → `CookieContent`

Dati del Titolare (nome, email, indirizzo, data di aggiornamento) e path delle
pagine stanno in `src/lib/legal.ts`: modificarli lì aggiorna tutte le pagine.

Le `page.tsx` in `src/app/(marketing)/` contengono solo `metadata`, titolo,
introduzione e il riferimento al componente di contenuto.

## Non in questa cartella

- Etichette funzionali (difficoltà, ripasso, status, anno): `src/lib/constants.ts`
- Menu e sezioni dell'area riservata: `src/lib/navigation.ts`
- Registro degli strumenti: `src/lib/tools.ts`
