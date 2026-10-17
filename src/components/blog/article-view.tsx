import { formatPostDate, readingMinutes } from "@/lib/blog";
import { RichContent } from "@/components/rich-content";

/**
 * Un articolo come lo leggono gli utenti. Lo usano sia la pagina pubblica
 * sia l'anteprima dell'editor admin, così le due non possono divergere.
 */
export function ArticleView({
  title,
  excerpt,
  content,
  publishedAt,
}: {
  title: string;
  excerpt?: string;
  content: string;
  publishedAt?: string | null;
}) {
  return (
    <article>
      <header>
        <h1 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[2.5rem]">
          {title || "Titolo dell'articolo"}
        </h1>
        {excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">{excerpt}</p>
        ) : null}
        <p className="mt-4 text-xs text-neutral-500">
          {publishedAt ? `${formatPostDate(publishedAt)} · ` : ""}
          {readingMinutes(content)} min di lettura
        </p>
      </header>
      <div className="mt-8 border-t border-neutral-200 pt-8">
        {content ? (
          <RichContent html={content} profile="blog" />
        ) : (
          <p className="text-sm italic text-neutral-400">
            Il testo dell&apos;articolo comparirà qui.
          </p>
        )}
      </div>
    </article>
  );
}
