# pediatro.me — piano di redesign UI/UX

## 1. Diagnosi

**Cosa fa sembrare il sito "generato"**

| Problema | Dove |
| --- | --- |
| Font Inter + grigi `slate` con sfumatura bluastra, in contrasto con il rosso | ovunque |
| Hero con alone sfumato sfocato, titolo con gradiente nel testo, pillola con puntino | landing |
| Ogni concetto è una card con icona in un quadratino colorato (feature, stat, intestazioni di sezione) | landing, dashboard, account, statistiche |
| `rounded-2xl/3xl` + ombra su tutto: nessuna gerarchia visiva | ovunque |
| Cerchi numerati 1-2-3, banner CTA con gradiente centrato, emoji 🎉, "Continua così!" | landing, quiz, dashboard |
| Il logo quadrato gigante come elemento dell'hero e del footer | landing, footer |

**Problemi di struttura / UX**

- Nome del sito "Pediatroma" nel testo, ma il marchio è **pediatro.me**.
- Navigazione: barra in alto con link piatti, Admin nascosto in una tendina. Non scala con Turni e Strumenti.
- `/statistiche` è in realtà il pannello **admin**; le statistiche personali stanno mischiate nella dashboard insieme al configuratore del quiz.
- L'amministrazione è divisa fra `/admin` (quiz), `/statistiche` e `/admin/utenti`, collegate da "pillole".
- Ogni pagina decide da sé larghezza massima, intestazione e spaziature; le card sono copiate e incollate.
- Il banner cookie copre l'hero su mobile.

## 2. Principi di design

- **Palette invariata**: rosso imperiale `brand-*` + bianco/grigio/nero. I grigi passano da `slate` a `neutral` (puri, senza dominante blu).
- **Il rosso è un accento**, non un riempimento: azioni primarie, stato attivo, dati principali. Verde/rosso semantici solo per giusto/sbagliato, sempre accompagnati da icona e testo.
- **Tipografia**: IBM Plex Sans (interfaccia) + Source Serif 4 (titoli): tono editoriale, "romano", clinico. Cifre tabulari per i dati.
- **Forme**: raggi piccoli (`rounded-md/lg`), bordi sottili, niente ombre decorative, niente gradienti.
- **Dati come dati**: strisce di numeri separate da filetti, barre sottili, tabelle; niente icone decorative.
- **Linguaggio**: asciutto, nessun punto esclamativo né emoji; numeri con separatore italiano (12.449).

## 3. Architettura delle pagine

```
src/app
├─ layout.tsx               root minimale (font, cookie notice)
├─ (marketing)/             header pubblico + footer
│   ├─ page.tsx             landing
│   └─ privacy · cookie · termini
├─ (auth)/                  layout centrato senza navigazione
├─ (app)/                   shell applicativa (sidebar desktop / drawer mobile)
│   ├─ dashboard            menu principale
│   ├─ quiz
│   ├─ statistiche          statistiche PERSONALI
│   ├─ turni                [in arrivo] pianificazione turni
│   ├─ strumenti            [in arrivo] segmentatore cellulare, genogrammi…
│   ├─ account
│   └─ admin                layout con sotto-navigazione
│       ├─ page.tsx         panoramica / statistiche globali
│       ├─ quiz             gestione quiz
│       └─ utenti[/id]      utenti e scheda utente
```

**Come aggiungere una nuova sezione**: una voce in `src/lib/navigation.ts` (`status: "soon"` → `"live"`)
e la cartella in `src/app/(app)/<sezione>`. Gli strumenti si registrano in `src/lib/tools.ts`.
Il proxy (`src/lib/supabase/proxy.ts`) va esteso con il nuovo prefisso protetto.

## 4. Design system (`src/components`)

`ui/page-header`, `ui/panel`, `ui/stat-strip`, `ui/meter`, `ui/badge`, `ui/empty-state`, `ui/sub-nav`,
`shell/app-nav` (sidebar + drawer), `site/site-header`, `site/site-footer`, `site/brand`.

## 5. Fasi

1. Fondamenta: token, font, rinomina in pediatro.me, componenti base.
2. Struttura: gruppi di route, shell applicativa, navigazione configurabile, segnaposto Turni/Strumenti.
3. Landing, footer, autenticazione.
4. Dashboard (menu) · Statistiche personali · Quiz.
5. Admin: panoramica, quiz, utenti.
6. Account, pagine di errore, legali, skeleton.
7. Verifica: build, lint, controllo visivo desktop/mobile.
