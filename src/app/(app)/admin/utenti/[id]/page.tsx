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
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-5 w-32 rounded bg-neutral-200/70" />
          <div className="mt-4 h-40 rounded-lg border border-neutral-200 bg-white" />
          <div className="mt-8 h-24 rounded-lg border border-neutral-200 bg-white" />
          <div className="mt-8 h-64 rounded-lg border border-neutral-200 bg-white" />
        </div>
      }
    >
      <AdminUserDetail params={props.params} />
    </Suspense>
  );
}