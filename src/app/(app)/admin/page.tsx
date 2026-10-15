import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewContent } from "./overview-content";

export const metadata: Metadata = {
  title: "Panoramica · Amministrazione",
  description: "Statistiche aggregate e anonime di pediatro.me.",
  robots: { index: false, follow: false },
};

export default function AdminOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-24 rounded-lg border border-neutral-200 bg-white" />
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="h-72 rounded-lg border border-neutral-200 bg-white" />
            <div className="h-72 rounded-lg border border-neutral-200 bg-white" />
          </div>
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
