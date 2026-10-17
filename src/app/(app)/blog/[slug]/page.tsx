import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { isValidSlug } from "@/lib/blog";
import { getPostBySlug } from "@/lib/blog-data";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { ArticleView } from "@/components/blog/article-view";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false },
};

function ArticleSkeleton() {
  return (
    <PageContainer width="narrow">
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-4 w-32 rounded bg-neutral-200/70" />
        <div className="mt-8 h-10 w-4/5 rounded bg-neutral-200" />
        <div className="mt-4 h-5 w-2/3 rounded bg-neutral-200/70" />
        <div className="mt-10 space-y-3 border-t border-neutral-200 pt-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-neutral-200/60" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

export default function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <BlogPost params={props.params} />
    </Suspense>
  );
}

async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Uno slug malformato non può esistere: niente interrogazione al database.
  if (!isValidSlug(slug)) notFound();

  const user = await requireUser(`/blog/${slug}`);
  const isAdmin = isAdminEmail(user.email);
  const result = await getPostBySlug(slug, { includeDrafts: isAdmin });

  if (result.status === "missing") notFound();
  if (result.status === "error") {
    return (
      <PageContainer width="narrow">
        <Alert variant="error">
          Impossibile caricare l&apos;articolo. Riprova tra qualche istante.
        </Alert>
      </PageContainer>
    );
  }

  const { post } = result;

  return (
    <PageContainer width="narrow">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tutti gli articoli
        </Link>
        {isAdmin ? (
          <ButtonLink href={`/admin/blog/${post.id}`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Modifica
          </ButtonLink>
        ) : null}
      </div>

      {isAdmin && !post.published ? (
        <Alert variant="info" className="mb-8">
          Questa è una bozza: la vedi solo tu, gli utenti non possono aprirla.
        </Alert>
      ) : null}

      <ArticleView
        title={post.title}
        excerpt={post.excerpt}
        content={post.content}
        publishedAt={post.published_at}
      />
    </PageContainer>
  );
}
