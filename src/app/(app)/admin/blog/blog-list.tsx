"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { blogPath } from "@/lib/blog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { deleteBlogPost, setBlogPostPublished } from "./actions";

export type AdminBlogRow = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

function pageHref(page: number) {
  return page > 1 ? `/admin/blog?page=${page}` : "/admin/blog";
}

export function AdminBlogList({
  posts,
  page,
  pageCount,
}: {
  posts: AdminBlogRow[];
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  async function run(
    id: string,
    action: () => Promise<{ ok: boolean; message: string }>
  ) {
    setBusyId(id);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ type: result.ok ? "success" : "error", message: result.message });
      if (result.ok) startTransition(() => router.refresh());
    } catch {
      setNotice({ type: "error", message: "Errore di rete. Riprova." });
    } finally {
      setBusyId(null);
    }
  }

  function handleDelete(post: AdminBlogRow) {
    const confirmed = window.confirm(
      `Eliminare definitivamente l'articolo "${post.title}"?\n\nI pulsanti che lo collegano nelle spiegazioni dei quiz smetteranno di funzionare.`
    );
    if (confirmed) void run(post.id, () => deleteBlogPost(post.id));
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Nessun articolo"
        action={<ButtonLink href="/admin/blog/nuovo">Scrivi il primo articolo</ButtonLink>}
      >
        {page > 1
          ? "Questa pagina non contiene articoli."
          : "Quando scriverai il primo articolo comparirà qui."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <Alert
          variant={notice.type === "success" ? "success" : "error"}
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      ) : null}

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {posts.map((post) => {
          const busy = busyId === post.id;
          return (
            <li
              key={post.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="text-sm font-medium leading-relaxed text-neutral-900 hover:text-brand-700"
                >
                  {post.title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <Badge tone={post.published ? "success" : "warning"}>
                    {post.published ? "Pubblicato" : "Bozza"}
                  </Badge>
                  <span className="truncate font-mono">{blogPath(post.slug)}</span>
                  <span>
                    {post.published && post.published_at
                      ? `Pubblicato il ${formatDate(post.published_at)}`
                      : `Modificato il ${formatDate(post.updated_at)}`}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ButtonLink
                  href={`/admin/blog/${post.id}`}
                  size="sm"
                  variant="secondary"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Modifica
                </ButtonLink>
                <ButtonLink
                  href={blogPath(post.slug)}
                  size="sm"
                  variant="ghost"
                  target="_blank"
                  rel="noopener"
                  aria-label={`Apri l'articolo "${post.title}"`}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(post.id, () => setBlogPostPublished(post.id, !post.published))
                  }
                  title={
                    post.published
                      ? "Nascondi l'articolo agli utenti"
                      : "Rendi l'articolo visibile agli utenti"
                  }
                >
                  {busy ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : post.published ? (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {post.published ? "Nascondi" : "Pubblica"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={busy}
                  onClick={() => handleDelete(post)}
                  aria-label={`Elimina l'articolo "${post.title}"`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <ButtonLink href={pageHref(page - 1)} variant="secondary" size="sm">
              Precedente
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              Precedente
            </Button>
          )}
          <p className="text-xs text-neutral-500">
            Pagina {page} di {pageCount}
          </p>
          {page < pageCount ? (
            <ButtonLink href={pageHref(page + 1)} variant="secondary" size="sm">
              Successiva
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              Successiva
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
