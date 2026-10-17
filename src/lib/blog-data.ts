import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BLOG_PAGE_SIZE,
  isMissingTableError,
  type BlogPost,
  type BlogPostSummary,
} from "@/lib/blog";

/**
 * Lettura degli articoli per gli utenti. Passa dal client con la sessione
 * dell'utente (non dalla chiave di servizio): la policy RLS
 * "blog_posts_select_published" restituisce comunque solo gli articoli
 * pubblicati, anche se un errore nel codice dimenticasse il filtro.
 *
 * Gli elenchi non scaricano mai il testo degli articoli.
 */

export const SUMMARY_COLUMNS = "id, slug, title, excerpt, published_at";
export const POST_COLUMNS =
  "id, slug, title, excerpt, content, published, published_at, updated_at";

export type PostsPage =
  | { status: "ok"; posts: BlogPostSummary[]; total: number }
  | { status: "unavailable" }
  | { status: "error" };

export async function listPublishedPosts(page: number): Promise<PostsPage> {
  const from = (page - 1) * BLOG_PAGE_SIZE;
  try {
    const supabase = await createClient();
    const { data, count, error } = await supabase
      .from("blog_posts")
      .select(SUMMARY_COLUMNS, { count: "exact" })
      .eq("published", true)
      .order("published_at", { ascending: false })
      .range(from, from + BLOG_PAGE_SIZE - 1);

    if (error) {
      return { status: isMissingTableError(error) ? "unavailable" : "error" };
    }
    return {
      status: "ok",
      posts: (data ?? []) as BlogPostSummary[],
      total: count ?? data?.length ?? 0,
    };
  } catch {
    return { status: "error" };
  }
}

export type PostResult =
  | { status: "ok"; post: BlogPost }
  | { status: "missing" }
  | { status: "error" };

/**
 * Un articolo per slug. Gli utenti vedono solo i pubblicati (e la RLS lo
 * garantisce); gli amministratori, che hanno già superato il controllo
 * ADMIN_EMAILS, vedono anche le bozze, per rileggerle prima di pubblicarle.
 */
export async function getPostBySlug(
  slug: string,
  options: { includeDrafts: boolean }
): Promise<PostResult> {
  try {
    const query = options.includeDrafts
      ? createAdminClient().from("blog_posts").select(POST_COLUMNS).eq("slug", slug)
      : (await createClient())
          .from("blog_posts")
          .select(POST_COLUMNS)
          .eq("slug", slug)
          .eq("published", true);
    const { data, error } = await query.maybeSingle();

    if (error) {
      return { status: isMissingTableError(error) ? "missing" : "error" };
    }
    return data ? { status: "ok", post: data as BlogPost } : { status: "missing" };
  } catch {
    return { status: "error" };
  }
}
