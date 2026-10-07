import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { COOKIE_PATH, TERMS_PATH } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) per gli utenti di Quiz Pediatria.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`La presente informativa è resa ai sensi degli articoli 13 e 14 del Regolamento UE 2016/679 ("GDPR") e del D.Lgs. 196/2003 e s.m.i. ("Codice Privacy") e descrive come ${LEGAL.siteName} tratta i dati personali degli utenti del servizio.`}
    >
      <h2>1. Titolare del trattamento</h2>
      <p>
        Titolare del trattamento dei dati personali è{" "}
        <strong>{LEGAL.owner}</strong>, contattabile all&apos;indirizzo email{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        {LEGAL.address ? ` (${LEGAL.address})` : ""}.
      </p>

      <h2>2. Quali dati raccogliamo</h2>
      <h3>2.1 Dati forniti direttamente</h3>
      <ul>
        <li>
          <strong>Dati di registrazione:</strong> indirizzo email e password. La
          password è gestita dal fornitore di autenticazione (Supabase) con
          algoritmi di hashing sicuri e non è mai accessibile in chiaro né al
          Titolare né ad altri utenti.
        </li>
        <li>
          <strong>Nome visualizzato:</strong> facoltativo, scelto dall&apos;utente
          per personalizzare l&apos;interfaccia.
        </li>
        <li>
          <strong>Consensi:</strong> data e ora di accettazione dei presenti
          documenti (Privacy Policy e Termini di servizio) ed eventuale consenso
          facoltativo a comunicazioni informative.
        </li>
      </ul>

      <h3>2.2 Dati generati dall&apos;utilizzo del servizio</h3>
      <ul>
        <li>
          <strong>Risultati dei quiz:</strong> domande somministrate, risposte
          selezionate, esito (corretto/errato), argomento, difficoltà e data di
          completamento. Questi dati sono utilizzati per mostrarti statistiche
          personali e non riguardano lo stato di salute dell&apos;utente: sono
          risposte a fini di studio e <em>non costituiscono dati sanitari</em>.
        </li>
        <li>
          <strong>Dati tecnici di sicurezza:</strong> indirizzo IP e log tecnici
          raccolti automaticamente dai fornitori di infrastruttura per erogare
          il servizio, garantire la sicurezza e prevenire abusi.
        </li>
      </ul>

      <h3>2.3 Cosa non raccogliamo</h3>
      <ul>
        <li>Nessun dato di profilazione pubblicitaria o commerciale.</li>
        <li>Nessun cookie di tracciamento o di terze parti (vedi la <Link href={COOKIE_PATH}>Cookie Policy</Link>).</li>
        <li>Nessun dato di pagamento (il servizio è gratuito e non richiede carte di credito).</li>
      </ul>

      <h2>3. Finalità e basi giuridiche del trattamento</h2>
      <table>
        <thead>
          <tr>
            <th>Finalità</th>
            <th>Base giuridica (art. 6 GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Creazione e gestione dell&apos;account, erogazione dei quiz e
              delle statistiche personali
            </td>
            <td>Esecuzione del contratto (art. 6, par. 1, lett. b)</td>
          </tr>
          <tr>
            <td>
              Sicurezza della piattaforma, prevenzione di abusi e accessi non
              autorizzati
            </td>
            <td>Interesse legittimo del Titolare (art. 6, par. 1, lett. f)</td>
          </tr>
          <tr>
            <td>Adempimento di obblighi di legge</td>
            <td>Obbligo legale (art. 6, par. 1, lett. c)</td>
          </tr>
          <tr>
            <td>
              Invio facoltativo di comunicazioni informative e aggiornamenti via
              email
            </td>
            <td>Consenso (art. 6, par. 1, lett. a), revocabile in ogni momento</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Natura del conferimento dei dati</h2>
      <p>
        Il conferimento di email e password è necessario per creare
        l&apos;account e utilizzare i quiz. Il nome visualizzato, il consenso
        marketing e l&apos;indirizzo per la fatturazione — non previsto — sono
        facoltativi. In assenza dei dati necessari non è possibile erogare il
        servizio.
      </p>

      <h2>5. Destinatari e responsabili del trattamento</h2>
      <p>
        I dati non sono venduti né comunicati a terzi per finalità proprie. Per
        erogare il servizio ci avvaliamo dei seguenti fornitori, nominati
        Responsabili del trattamento ai sensi dell&apos;art. 28 GDPR:
      </p>
      <table>
        <thead>
          <tr>
            <th>Fornitore</th>
            <th>Ruolo</th>
            <th>Informativa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc.</td>
            <td>Database e autenticazione (account, sessioni, risultati quiz)</td>
            <td>
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                supabase.com/privacy
              </a>
            </td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>Hosting e distribuzione del sito web</td>
            <td>
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                vercel.com/legal/privacy-policy
              </a>
            </td>
          </tr>
          <tr>
            <td>Resend (Plus Five Five, Inc.)</td>
            <td>
              Invio delle email transazionali (conferma registrazione, recupero
              password)
            </td>
            <td>
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                resend.com/legal/privacy-policy
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        I dati potranno inoltre essere comunicati all&apos;autorità giudiziaria
        o amministrativa, su richiesta e nei casi previsti dalla legge.
      </p>

      <h2>6. Trasferimenti verso Paesi extra-UE</h2>
      <p>
        I fornitori indicati possono trattare dati anche al di fuori dello
        Spazio Economico Europeo. In tal caso i trasferimenti avvengono sulla
        base di garanzie appropriate ai sensi degli artt. 44-49 GDPR, in
        particolare Clausole Contrattuali Standard approvate dalla Commissione
        Europea (decisione 2021/914/UE) e, ove applicabile, del quadro EU-US
        Data Privacy Framework. Puoi richiedere maggiori informazioni
        scrivendo al Titolare.
      </p>

      <h2>7. Periodo di conservazione</h2>
      <ul>
        <li>
          <strong>Dati dell&apos;account e risultati dei quiz:</strong> conservati
          finché l&apos;account resta attivo. Puoi eliminarli in qualsiasi
          momento dalla pagina <em>Account</em>; la cancellazione è immediata e
          definitiva (eventuali copie di backup tecniche sono eliminate entro 30
          giorni).
        </li>
        <li>
          <strong>Log tecnici di sicurezza:</strong> conservati per il tempo
          strettamente necessario alla sicurezza del servizio, secondo le
          politiche dei fornitori (di norma fino a 30 giorni).
        </li>
        <li>
          <strong>Dati necessari all&apos;adempimento di obblighi di legge:</strong>{" "}
          conservati per i termini di legge applicabili.
        </li>
      </ul>

      <h2>8. Diritti dell&apos;interessato</h2>
      <p>
        Ai sensi degli artt. 15-22 GDPR puoi esercitare in ogni momento i
        diritti di: accesso ai dati; rettifica; cancellazione; limitazione del
        trattamento; opposizione; portabilità dei dati; revoca dei consensi
        prestati. Per agevolarti:
      </p>
      <ul>
        <li>
          dalla pagina <em>Account</em> puoi <strong>esportare tutti i tuoi dati</strong>{" "}
          in formato JSON e <strong>eliminare definitivamente l&apos;account</strong>;
        </li>
        <li>
          per ogni altra richiesta scrivi a{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>: risponderemo entro
          un mese.
        </li>
      </ul>
      <p>
        Hai inoltre il diritto di proporre reclamo all&apos;Autorità di
        controllo italiana:{" "}
        <a
          href="https://www.garanteprivacy.it"
          target="_blank"
          rel="noopener noreferrer"
        >
          Garante per la protezione dei dati personali
        </a>
        .
      </p>

      <h2>9. Minori</h2>
      <p>
        Il servizio non è destinato a minori di 14 anni, età minima prevista
        dall&apos;art. 2-quinquies del Codice Privacy per la validità del
        consenso ai servizi della società dell&apos;informazione. Gli utenti
        devono avere almeno 14 anni; se hai meno di 14 anni non registrarti e
        non fornire dati personali.
      </p>

      <h2>10. Sicurezza</h2>
      <p>
        Adottiamo misure tecniche e organizzative adeguate (art. 32 GDPR), tra
        cui: cifratura delle comunicazioni (TLS/HTTPS), password memorizzate
        esclusivamente come hash, isolamento dei dati a livello di riga nel
        database (Row Level Security), accesso ai sistemi limitato allo stretto
        necessario.
      </p>

      <h2>11. Processi decisionali automatizzati</h2>
      <p>
        Non effettuiamo profilazione né adottiamo decisioni automatizzate che
        producano effetti giuridici o incidano in modo significativo
        sull&apos;utente ai sensi dell&apos;art. 22 GDPR.
      </p>

      <h2>12. Modifiche alla presente informativa</h2>
      <p>
        Questa informativa può essere aggiornata nel tempo: la versione vigente
        è sempre pubblicata su questa pagina con la data di ultimo
        aggiornamento. In caso di modifiche sostanziali ne daremo avviso agli
        utenti registrati via email.
      </p>

      <hr />
      <p className="muted">
        Vedi anche la <Link href={COOKIE_PATH}>Cookie Policy</Link> e i{" "}
        <Link href={TERMS_PATH}>Termini di servizio</Link>.
      </p>
    </LegalPage>
  );
}
