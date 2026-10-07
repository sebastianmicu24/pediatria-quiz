import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminContent } from "./admin-content";

export const metadata: Metadata = {
  title: "Gestione quiz",
  description: "Gestione delle domande di Pediatroma (solo amministratori).",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-8 w-56 rounded-lg bg-slate-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200/70" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          </div>
        }
      >
        <AdminContent />
      </Suspense>
    </div>
  );
}
