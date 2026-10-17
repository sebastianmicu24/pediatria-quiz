import type { Metadata } from "next";
import { Suspense } from "react";
import type { AdminSearchParams } from "@/lib/supabase/search-params";
import { BlogAdminContent } from "./blog-admin-content";

export const metadata: Metadata = {
  title: "Blog · Amministrazione",
  description: "Gestione degli articoli del blog di pediatro.me (solo amministratori).",
  robots: { index: false, follow: false },
};

export default function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-10 w-48 rounded-md bg-neutral-200/70" />
          <div className="mt-6 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <BlogAdminContent searchParams={searchParams} />
    </Suspense>
  );
}
