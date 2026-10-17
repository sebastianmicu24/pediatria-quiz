import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { isMissingTableError } from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePage, type AdminSearchParams } from "@/lib/supabase/search-params";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AdminBlogList, type AdminBlogRow } from "./blog-list";

const PAGE_SIZE = 20;

/** Elenco degli articoli (bozze comprese), dal più recentemente modificato. */
export async function BlogAdminContent({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();

  const page = parsePage((await searchParams).page);
  const from = (page - 1) * PAGE_SIZE;

  const { data, count, error } = await createAdminClient()
    .from("blog_posts")
    .select("id, slug, title, published, published_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    return (
      <Alert variant="error">
        {isMissingTableError(error)
          ? "Il blog non è ancora attivo nel database: esegui la migrazione supabase/migrations/2026-10-17_blog.sql nell'SQL Editor di Supabase, poi ricarica la pagina."
          : "Impossibile caricare gli articoli: verifica la configurazione e riprova."}
      </Alert>
    );
  }

  const posts = (data ?? []) as AdminBlogRow[];
  const total = count ?? posts.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          {total} {total === 1 ? "articolo" : "articoli"}. Solo quelli
          pubblicati sono visibili agli utenti; le bozze le vedi solo tu.
        </p>
        <ButtonLink href="/admin/blog/nuovo">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuovo articolo
        </ButtonLink>
      </div>

      <div className="mt-6">
        <AdminBlogList posts={posts} page={page} pageCount={pageCount} />
      </div>
    </>
  );
}
