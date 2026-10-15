import { Suspense, type ReactNode } from "react";
import { Footer } from "@/components/footer";
import {
  SiteHeader,
  SiteHeaderSkeleton,
} from "@/components/site/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<SiteHeaderSkeleton />}>
        <SiteHeader />
      </Suspense>
      <main id="contenuto" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
