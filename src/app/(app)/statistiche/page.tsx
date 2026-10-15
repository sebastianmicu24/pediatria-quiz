import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/ui/page";
import { StatisticheContent } from "./statistiche-content";

export const metadata: Metadata = {
  title: "Statistiche",
  description: "Il tuo andamento: precisione, copertura e attività.",
  robots: { index: false, follow: false },
};

export default function StatistichePage() {
  return (
    <Suspense
      fallback={
        <PageContainer width="wide">
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-9 w-64 rounded bg-neutral-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-neutral-200/70" />
            <div className="mt-8 h-24 rounded-lg border border-neutral-200 bg-white" />
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div className="h-60 rounded-lg border border-neutral-200 bg-white" />
              <div className="h-60 rounded-lg border border-neutral-200 bg-white" />
            </div>
            <div className="mt-8 h-96 rounded-lg border border-neutral-200 bg-white" />
          </div>
        </PageContainer>
      }
    >
      <StatisticheContent />
    </Suspense>
  );
}
