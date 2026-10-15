import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TermsContent } from "@/content/legal/termini";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termini di servizio",
  description:
    "Condizioni d'uso del servizio pediatro.me: descrizione, obblighi dell'utente, disclaimer medico e legge applicabile.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Termini di servizio"
      intro={`I presenti termini regolano l'utilizzo di ${LEGAL.siteName} (il "Servizio"). Utilizzando il Servizio, creando un account o selezionando la casella di accettazione in fase di registrazione, l'utente dichiara di aver letto, compreso e accettato integralmente queste condizioni.`}
    >
      <TermsContent />
    </LegalPage>
  );
}
