import type { Metadata } from "next";
import { Suspense } from "react";
import { StatisticheContent } from "./statistiche-content";

export const metadata: Metadata = {
  title: "Statistiche",
  description: "Statistiche aggregate e anonime di Pediatroma.",
  robots: { index: false, follow: false },
};

export default function StatistichePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-8 w-56 rounded-lg bg-slate-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200/70" />
            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
              <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        }
      >
        <StatisticheContent />
      </Suspense>
    </div>
  );
}
