import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUsersContent } from "./admin-users-content";

export const metadata: Metadata = {
  title: "Utenti · Amministrazione",
  description: "Elenco degli utenti registrati e gestione dei tag.",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-8 w-40 rounded-lg bg-slate-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200/70" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          </div>
        }
      >
        <AdminUsersContent />
      </Suspense>
    </div>
  );
}
