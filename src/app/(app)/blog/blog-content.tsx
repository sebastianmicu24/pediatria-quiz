import Link from "next/link";
import { ArrowRight, Settings2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { BLOG_PAGE_SIZE, blogPath, formatPostDate } from "@/lib/blog";
import { listPublishedPosts } from "@/lib/blog-data";
import { parsePage, type AdminSearchParams } from "@/lib/supabase/search-params";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer, PageHeader } from "@/components/ui/page";

export async function BlogContent({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const user = await requireUser("/blog");
  const isAdmin = isAdminEmail(user.email);
  const page = parsePage((await searchParams).page);
  const result = await listPublishedPosts(page);

  const pageCount =
    result.status === "ok" ? Math.max(1, Math.ceil(result.total / BLOG_PAGE_SIZE)) : 1;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Approfondimenti"
        title="Blog"
        description="Articoli di pediatria da leggere insieme alle esercitazioni: spesso li ritroverai collegati dalle spiegazioni dei quiz."
        actions={
          isAdmin ? (
            <ButtonLink href="/admin/blog" variant="secondary" size="sm">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Gestisci il blog
            </ButtonLink>
          ) : null
        }
      />

      <div className="mt-8">
        {result.status === "error" ? (
          <Alert variant="error">
            Impossibile caricare gli articoli. Riprova tra qualche istante.
          </Alert>
        ) : result.status === "unavailable" || result.posts.length === 0 ? (
          <EmptyState title="Nessun articolo, per ora">
            {page > 1
              ? "Questa pagina non contiene articoli."
              : "Il blog è in preparazione: torna presto per i primi approfondimenti."}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {result.posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={blogPath(post.slug)}
                  className="group flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                >
                  {post.published_at ? (
                    <time
                      dateTime={post.published_at}
                      className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-500"
                    >
                      {formatPostDate(post.published_at)}
                    </time>
                  ) : null}
                  <h2 className="mt-2 font-serif text-xl font-semibold leading-snug tracking-tight text-neutral-900 group-hover:text-brand-800">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-brand-700">
                    Leggi l&apos;articolo
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav
            aria-label="Pagine del blog"
            className="mt-8 flex items-center justify-between gap-3"
          >
            {page > 1 ? (
              <ButtonLink
                href={page - 1 > 1 ? `/blog?page=${page - 1}` : "/blog"}
                variant="secondary"
                size="sm"
              >
                Più recenti
              </ButtonLink>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                Più recenti
              </Button>
            )}
            <p className="text-xs text-neutral-500">
              Pagina {page} di {pageCount}
            </p>
            {page < pageCount ? (
              <ButtonLink
                href={`/blog?page=${page + 1}`}
                variant="secondary"
                size="sm"
              >
                Meno recenti
              </ButtonLink>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                Meno recenti
              </Button>
            )}
          </nav>
        ) : null}
      </div>
    </PageContainer>
  );
}
