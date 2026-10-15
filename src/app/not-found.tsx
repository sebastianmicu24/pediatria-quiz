import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { StatusPage } from "@/components/status-page";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenuto">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="pediatro.me — Home">
          <LogoWordmark />
        </Link>
      </div>
      <StatusPage
        code="Errore 404"
        title="Pagina non trovata"
        actions={
          <>
            <ButtonLink href="/">Torna alla home</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Vai alla dashboard
            </ButtonLink>
          </>
        }
      >
        <p>
          La pagina che cerchi non esiste o è stata spostata. Controlla
          l&apos;indirizzo oppure torna alla home.
        </p>
      </StatusPage>
    </main>
  );
}
