import { StatusPage } from "@/components/status-page";
import { ButtonLink } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <StatusPage
      code="Errore 404"
      title="Pagina non trovata"
      className="mx-0"
      actions={<ButtonLink href="/dashboard">Torna alla dashboard</ButtonLink>}
    >
      <p>
        La pagina che cerchi non esiste, è stata spostata oppure non hai i
        permessi per vederla.
      </p>
    </StatusPage>
  );
}
