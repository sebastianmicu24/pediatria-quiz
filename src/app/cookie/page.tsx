import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Quali cookie utilizza Pediatroma: solo cookie tecnici necessari all'autenticazione, nessun tracciamento.",
};

export default function CookiePage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={`Questa pagina descrive, ai sensi dell'art. 122 del D.Lgs. 196/2003 e delle Linee guida del Garante Privacy del 10 giugno 2021, quali cookie e tecnologie simili utilizza ${LEGAL.siteName}.`}
    >
      <h2>1. Cosa sono i cookie</h2>
      <p>
        I cookie sono piccoli file di testo che i siti visitati inviano al
        browser dell&apos;utente, dove vengono memorizzati per poi essere
        ritrasmessi agli stessi siti alla visita successiva. Tecnologie analoghe
        (ad esempio il <em>localStorage</em>) permettono di memorizzare
        informazioni direttamente nel browser.
      </p>

      <h2>2. Cookie utilizzati da questo sito</h2>
      <p>
        Il sito utilizza <strong>esclusivamente cookie tecnici</strong>,
        indispensabili per garantire le funzionalità di autenticazione. Non
        utilizziamo cookie di profilazione, cookie analitici, pixel di
        tracciamento o cookie di terze parti a fini pubblicitari.
      </p>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Finalità</th>
            <th>Categoria</th>
            <th>Durata</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sb-&lt;project-ref&gt;-auth-token</code> (ed eventuali
              frammenti <code>.0</code>, <code>.1</code>…)
            </td>
            <td>
              Gestione della sessione di accesso: consente di rimanere
              autenticati durante la navigazione tra le pagine protette
              (dashboard, quiz, account)
            </td>
            <td>Tecnico — necessario</td>
            <td>Fino a 7 giorni dall&apos;ultimo accesso, o fino alla disconnessione</td>
          </tr>
        </tbody>
      </table>

      <p>
        Il cookie di sessione è impostato in modalità <code>HttpOnly</code> e{" "}
        <code>SameSite=Lax</code>, con invio solo su connessioni cifrate in
        produzione.
      </p>

      <h3>Memorizzazioni nel browser (localStorage)</h3>
      <ul>
        <li>
          <code>pediatroma:cookie-notice-v1</code> — ricorda che hai preso
          visione di questo avviso, così da non ripresentarlo a ogni visita.
        </li>
      </ul>

      <h2>3. Nessun tracciamento di terze parti</h2>
      <p>
        Non sono attivi strumenti di analytics, social plugin o pubblicità. Di
        conseguenza, il sito non richiede alcun consenso preventivo per i
        cookie: quelli utilizzati rientrano tra le eccezioni previste dalla
        normativa (cookie tecnici necessari al funzionamento del servizio). Per
        completezza, l&apos;avviso che vedi alla prima visita ha finalità
        puramente informativa e può essere chiuso senza effetti sul
        funzionamento del sito.
      </p>

      <h2>4. Come gestire i cookie dal browser</h2>
      <p>
        Puoi gestire, limitare o eliminare i cookie attraverso le impostazioni
        del tuo browser. Ti segnaliamo però che disabilitare i cookie tecnici
        impedisce l&apos;accesso alle aree riservate del sito (dashboard, quiz,
        account). Istruzioni dei browser più diffusi:
      </p>
      <ul>
        <li>Google Chrome — Impostazioni → Privacy e sicurezza → Cookie</li>
        <li>Mozilla Firefox — Impostazioni → Privacy e sicurezza</li>
        <li>Microsoft Edge — Impostazioni → Cookie e autorizzazioni sito</li>
        <li>Apple Safari — Preferenze → Privacy</li>
      </ul>

      <h2>5. Titolare del trattamento e riferimenti</h2>
      <p>
        Il Titolare del trattamento è <strong>{LEGAL.owner}</strong> (
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>). Per il dettaglio
        completo dei trattamenti, dei diritti esercitabili e dei tempi di
        conservazione consulta la <Link href={PRIVACY_PATH}>Privacy Policy</Link>{" "}
        e i <Link href={TERMS_PATH}>Termini di servizio</Link>.
      </p>
    </LegalPage>
  );
}
