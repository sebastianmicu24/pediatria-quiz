import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { UUID_REGEX, type AdminBlogPost } from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstParam } from "@/lib/supabase/search-params";
import { Alert } from "@/components/ui/alert";
import { PostForm } from "../post-form";

export const metadata: Metadata = {
  title: "Modifica articolo · Amministrazione",
  robots: { index: false, follow: false },
};

export default function EditBlogPostPage(props: PageProps<"/admin/blog/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-5 w-32 rounded bg-neutral-200/70" />
          <div className="mt-6 h-12 rounded-md bg-neutral-200/70" />
          <div className="mt-6 h-[28rem] rounded-lg border border-neutral-200 bg-white" />
        </div>
      }
    >
      <EditBlogPost params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function EditBlogPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();
  const created = firstParam((await searchParams).creato) === "1";

  const { data, error } = await createAdminClient()
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, content, published, published_at, updated_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <Alert variant="error">
        Impossibile caricare l&apos;articolo: verifica la configurazione e riprova.
      </Alert>
    );
  }
  if (!data) notFound();

  const post = data as AdminBlogPost;
  // La chiave cambia con l'articolo: il modulo riparte dai suoi dati.
  return <PostForm key={post.id} post={post} created={created} />;
}
