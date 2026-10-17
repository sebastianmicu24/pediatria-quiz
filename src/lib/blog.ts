import { stripHtml } from "@/lib/utils";

/**
 * Costanti e funzioni condivise dal blog (server e client).
 * Nessun accesso al database qui: vedi src/lib/blog-data.ts.
 */

/** Lo slug compare nell'URL (/blog/<slug>) e nei pulsanti dei quiz. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 80;

export const TITLE_MIN = 3;
export const TITLE_MAX = 150;
export const EXCERPT_MAX = 300;
/** Testo dell'articolo già sanitizzato (HTML compreso). */
export const CONTENT_MAX = 200_000;
/** Limite sul testo grezzo ricevuto, prima di sanitizzarlo. */
export const CONTENT_RAW_MAX = 300_000;

export const BLOG_PAGE_SIZE = 12;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSlug(value: string): boolean {
  return (
    value.length >= SLUG_MIN && value.length <= SLUG_MAX && SLUG_REGEX.test(value)
  );
}

/** "Che cos'è la bronchiolite?" → "che-cos-e-la-bronchiolite". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function blogPath(slug: string): string {
  return `/blog/${slug}`;
}

/** Tempo di lettura stimato (200 parole al minuto), almeno 1 minuto. */
export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "17 ottobre 2026". */
export function formatPostDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function countWords(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  published_at: string | null;
};

export type BlogPost = BlogPostSummary & {
  content: string;
  published: boolean;
  updated_at: string;
};

/** Articolo come lo vede l'amministratore nell'editor. */
export type AdminBlogPost = BlogPost & {
  created_at: string;
};

/**
 * Tabella assente: la migrazione del blog non è ancora stata applicata
 * (Postgres 42P01, oppure PGRST205 dalla cache dello schema di PostgREST).
 */
export function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /could not find the table|relation .* does not exist/i.test(
    error.message ?? ""
  );
}
