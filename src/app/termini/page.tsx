import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";
import { COOKIE_PATH, PRIVACY_PATH } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description:
    "Condizioni d'uso del servizio Pediatroma: descrizione, obblighi dell'utente, disclaimer medico e legge applicabile.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Termini di servizio"
      intro={`I presenti termini regolano l'utilizzo di ${LEGAL.siteName} (il "Servizio"). Utilizzando il Servizio, creando un account o selezionando la casella di accettazione in fase di registrazione, l'utente dichiara di aver letto, compreso e accettato integralmente queste condizioni.`}
    >
      <h2>1. Titolare del Servizio</h2>
      <p>
        Il Servizio è gestito da <strong>{LEGAL.owner}</strong>, contattabile
        all&apos;indirizzo <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Descrizione del Servizio</h2>
      <p>
        {LEGAL.siteName} è una piattaforma didattica che consente agli utenti
        registrati di svolgere quiz di pediatria, consultare le spiegazioni
        delle risposte e visualizzare statistiche personali sui risultati. Il
        Servizio è gratuito e fornito &quot;così com&apos;è&quot;.
      </p>

      <h2>3. Avvertenza medica</h2>
      <p>
        <strong>
          I contenuti del Servizio hanno esclusivamente finalità informative e
          didattiche.
        </strong>{" "}
        Non costituiscono consulenza medica, diagnosi o terapia e non
        sostituiscono in alcun modo lo studio sui manuali di riferimento, le
        linee guida ufficiali, il giudizio clinico o il parere di un
        professionista sanitario qualificato. L&apos;utente si assume ogni
        responsabilità per l&apos;uso delle informazioni acquisite tramite il
        Servizio. In caso di necessità cliniche rivolgersi sempre a personale
        sanitario qualificato.
      </p>

      <h2>4. Account e registrazione</h2>
      <ul>
        <li>
          Per utilizzare il Servizio è necessario creare un account fornendo un
          indirizzo email valido e una password.
        </li>
        <li>
          L&apos;utente si impegna a fornire dati veritieri, a custodire le
          credenziali con diligenza e a non condividerle con terzi. Le
          attività svolte tramite l&apos;account sono imputate al titolare
          dell&apos;account stesso.
        </li>
        <li>
          Il Servizio è destinato a utenti di età non inferiore a{" "}
          <strong>14 anni</strong> (età minima per la validità del consenso ai
          sensi dell&apos;art. 2-quinquies del Codice Privacy). Registrandoti
          dichiari di avere almeno 14 anni.
        </li>
        <li>
          È consentito un solo account per persona. Gli account sono personali e
          non cedibili.
        </li>
      </ul>

      <h2>5. Uso consentito</h2>
      <p>L&apos;utente si impegna a non:</p>
      <ul>
        <li>
          estrarre, copiare o ripubblicare in modo massivo i contenuti del
          Servizio (domande, spiegazioni, statistiche) con mezzi automatici o
          manuali;
        </li>
        <li>
          aggirare, disattivare o compromettere le misure di sicurezza, i
          sistemi di autenticazione o i limiti d&apos;uso;
        </li>
        <li>
          utilizzare il Servizio per scopi illeciti o in violazione di diritti
          di terzi;
        </li>
        <li>
          sovraccaricare intenzionalmente l&apos;infrastruttura (ad esempio
          con richieste automatizzate).
        </li>
      </ul>

      <h2>6. Proprietà intellettuale</h2>
      <ul>
        <li>
          I contenuti didattici derivano da materiale di studio pediatrico di
          diffusione scientifica e sono riprodotti/riadattati per finalità
          didattiche. Eventuali riferimenti bibliografici citati appartengono ai
          rispettivi titolari.
        </li>
        <li>
          Il codice, il design e i marchi del Servizio sono protetti dalle
          normative applicabili in materia di proprietà intellettuale e non
          possono essere riprodotti senza autorizzazione.
        </li>
        <li>
          Le statistiche generate dall&apos;uso del Servizio restano a
          disposizione dell&apos;utente, che può esportarle o richiederne la
          cancellazione.
        </li>
      </ul>

      <h2>7. Limitazione di responsabilità</h2>
      <p>
        Il Servizio è fornito &quot;così com&apos;è&quot; e &quot;come
        disponibile&quot;. Nei limiti consentiti dalla legge, il Titolare non
        garantisce l&apos;assenza di errori nei contenuti, la completezza o
        l&apos;aggiornamento rispetto alla letteratura scientifica più recente,
        né la continuità e l&apos;assoluta assenza di interruzioni del Servizio.
        Il Titolare non potrà essere ritenuto responsabile per danni derivanti
        dall&apos;uso o dall&apos;impossibilità di usare il Servizio, o da
        decisioni cliniche o professionali basate sui contenuti dello stesso.
        Nulla in questi termini limita i diritti inderogabili dei consumatori
        previsti dal Codice del Consumo (D.Lgs. 206/2005).
      </p>

      <h2>8. Sospensione e cessazione</h2>
      <ul>
        <li>
          Il Titolare può sospendere o chiudere un account in caso di violazione
          dei presenti termini o di utilizzo abusivo del Servizio, dandone
          comunicazione all&apos;utente ove possibile.
        </li>
        <li>
          L&apos;utente può cessare il rapporto in qualsiasi momento eliminando
          il proprio account dalla pagina <em>Account</em>; i dati saranno
          cancellati secondo la <Link href={PRIVACY_PATH}>Privacy Policy</Link>.
        </li>
      </ul>

      <h2>9. Modifiche ai termini</h2>
      <p>
        Il Titolare può aggiornare i presenti termini per esigenze normative o
        organizzative. La versione vigente è sempre pubblicata su questa pagina.
        In caso di modifiche sostanziali ne sarà dato avviso agli utenti
        registrati; l&apos;uso continuato del Servizio dopo l&apos;aggiornamento
        costituisce accettazione delle nuove condizioni.
      </p>

      <h2>10. Legge applicabile e foro competente</h2>
      <p>
        I presenti termini sono regolati dalla legge italiana. Per le
        controversie con i consumatori è competente il foro del luogo di
        residenza o domicilio del consumatore, ove applicabile ai sensi del
        Codice del Consumo; negli altri casi è competente il foro del Titolare.
      </p>

      <hr />
      <p className="muted">
        Vedi anche la <Link href={PRIVACY_PATH}>Privacy Policy</Link> e la{" "}
        <Link href={COOKIE_PATH}>Cookie Policy</Link>.
      </p>
    </LegalPage>
  );
}
