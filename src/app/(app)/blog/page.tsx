import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/ui/page";
import type { AdminSearchParams } from "@/lib/supabase/search-params";
import { BlogContent } from "./blog-content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Approfondimenti di pediatria da leggere insieme alle esercitazioni.",
  robots: { index: false, follow: false },
};

export default function BlogPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-9 w-40 rounded bg-neutral-200" />
            <div className="mt-3 h-5 w-96 max-w-full rounded bg-neutral-200/70" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-lg border border-neutral-200 bg-white"
                />
              ))}
            </div>
          </div>
        </PageContainer>
      }
    >
      <BlogContent searchParams={searchParams} />
    </Suspense>
  );
}
