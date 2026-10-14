import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUserDetail } from "./admin-user-detail";

export const metadata: Metadata = {
  title: "Scheda utente · Amministrazione",
  description: "Andamento e informazioni di un utente registrato.",
  robots: { index: false, follow: false },
};

export default function AdminUserPage(props: PageProps<"/admin/utenti/[id]">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-5 w-32 rounded bg-slate-200/70" />
            <div className="mt-4 h-28 rounded-2xl border border-slate-200 bg-white" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
            <div className="mt-6 h-64 rounded-2xl border border-slate-200 bg-white" />
          </div>
        }
      >
        <AdminUserDetail params={props.params} />
      </Suspense>
    </div>
  );
}
