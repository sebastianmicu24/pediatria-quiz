import type { Metadata } from "next";
import { Suspense } from "react";
import type { AdminSearchParams } from "@/lib/supabase/search-params";
import { AdminUsersContent } from "./admin-users-content";

export const metadata: Metadata = {
  title: "Utenti · Amministrazione",
  description: "Elenco degli utenti registrati e gestione dei tag.",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-10 max-w-sm rounded-md bg-neutral-200/70" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-28 rounded-lg border border-neutral-200 bg-white"
              />
            ))}
          </div>
        </div>
      }
    >
      <AdminUsersContent searchParams={searchParams} />
    </Suspense>
  );
}
