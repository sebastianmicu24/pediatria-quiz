import { Suspense, type ReactNode } from "react";
import { NavLoader, NavSkeleton } from "@/components/shell/nav-loader";

/**
 * Shell dell'area riservata: navigazione laterale + contenuto.
 * Ogni pagina decide la propria larghezza con <PageContainer>.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-60">
      <Suspense fallback={<NavSkeleton />}>
        <NavLoader />
      </Suspense>
      <main id="contenuto" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
