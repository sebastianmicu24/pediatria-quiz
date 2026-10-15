import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_NAV } from "@/lib/navigation";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { SubNav } from "@/components/ui/sub-nav";

/**
 * Le pagine di amministrazione condividono intestazione e schede.
 * L'accesso viene verificato qui prima di mostrare qualsiasi cosa, così
 * chi non è admin riceve un 404 senza intravedere la struttura.
 */
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Amministrazione"
        title="Pannello di controllo"
        description="Statistiche globali, gestione delle domande e schede utente."
      />
      <div className="mt-6">
        <SubNav label="Sezioni amministrazione" items={ADMIN_NAV} />
      </div>
      <div className="mt-8">{children}</div>
    </PageContainer>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageContainer width="wide">
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-9 w-72 rounded bg-neutral-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-neutral-200/70" />
            <div className="mt-8 h-10 border-b border-neutral-200" />
            <div className="mt-8 h-72 rounded-lg border border-neutral-200 bg-white" />
          </div>
        </PageContainer>
      }
    >
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
