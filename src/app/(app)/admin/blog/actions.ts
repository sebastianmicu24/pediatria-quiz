"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import {
  CONTENT_MAX,
  CONTENT_RAW_MAX,
  EXCERPT_MAX,
  TITLE_MAX,
  TITLE_MIN,
  UUID_REGEX,
  isMissingTableError,
  isValidSlug,
  slugify,
} from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearchTerm } from "@/lib/supabase/search-params";
import { uploadPublicImage, type UploadImageResult } from "@/lib/storage-images";
import { sanitizeHtml, stripHtml } from "@/lib/utils";

/**
 * Azioni dell'area admin del blog. Ognuna ricontrolla da sé che chi la
 * invoca sia un amministratore (le Server Action sono endpoint pubblici:
 * il controllo della pagina che le mostra non basta), valida ogni campo e
 * scrive con la chiave di servizio solo i campi previsti.
 */

export type BlogFormState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Valori effettivamente salvati (sanitizzati), per riallineare l'editor. */
  saved?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    published: boolean;
    firstPublished: boolean;
  };
};

const NOT_AUTHORIZED = "Non autorizzato.";
const SAVE_FAILED = "Salvataggio non riuscito. Riprova.";

async function currentAdmin() {
  const user = await requireUser("/admin/blog");
  return isAdminEmail(user.email) ? user : null;
}

function hasReadableContent(html: string): boolean {
  return stripHtml(html).length >= 20 || /<img\s/i.test(html);
}

export async function saveBlogPost(
  _prev: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  const user = await currentAdmin();
  if (!user) return { status: "error", message: NOT_AUTHORIZED };

  const idRaw = String(formData.get("id") ?? "").trim();
  if (idRaw && !UUID_REGEX.test(idRaw)) {
    return { status: "error", message: "Identificativo dell'articolo non valido." };
  }
  const id = idRaw || null;

  const title = String(formData.get("title") ?? "").replace(/\s+/g, " ").trim();
  if (title.length < TITLE_MIN) {
    return { status: "error", message: "Il titolo è troppo corto." };
  }
  if (title.length > TITLE_MAX) {
    return { status: "error", message: `Il titolo supera i ${TITLE_MAX} caratteri.` };
  }

  const slug = slugify(String(formData.get("slug") ?? "")) || slugify(title);
  if (!isValidSlug(slug)) {
    return {
      status: "error",
      message:
        "L'indirizzo (slug) non è valido: usa da 3 a 80 caratteri tra lettere, numeri e trattini.",
    };
  }

  const excerpt = String(formData.get("excerpt") ?? "").replace(/\s+/g, " ").trim();
  if (excerpt.length > EXCERPT_MAX) {
    return { status: "error", message: `Il riassunto supera i ${EXCERPT_MAX} caratteri.` };
  }

  const rawContent = String(formData.get("content") ?? "");
  if (rawContent.length > CONTENT_RAW_MAX) {
    return { status: "error", message: "L'articolo è troppo lungo." };
  }
  // L'editor aggiunge sempre un paragrafo vuoto in coda: non si salva.
  const content = sanitizeHtml(rawContent.trim(), "blog").replace(
    /(?:<p>(?:<br>)?<\/p>)+$/,
    ""
  );
  if (content.length > CONTENT_MAX) {
    return { status: "error", message: "L'articolo è troppo lungo." };
  }

  const wantsPublished = String(formData.get("published") ?? "") === "true";
  if (wantsPublished && !hasReadableContent(content)) {
    return {
      status: "error",
      message: "Scrivi almeno qualche riga prima di pubblicare l'articolo.",
    };
  }

  const admin = createAdminClient();

  let publishedAt: string | null = null;
  if (id) {
    const { data: current, error } = await admin
      .from("blog_posts")
      .select("slug, published_at")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return {
        status: "error",
        message: isMissingTableError(error)
          ? "Il blog non è ancora attivo nel database: esegui la migrazione 2026-10-17_blog.sql."
          : SAVE_FAILED,
      };
    }
    if (!current) {
      return { status: "error", message: "L'articolo non esiste più." };
    }
    if (current.published_at && current.slug !== slug) {
      return {
        status: "error",
        message:
          "L'indirizzo non si può cambiare dopo la prima pubblicazione: i link esistenti (anche quelli nelle spiegazioni dei quiz) smetterebbero di funzionare.",
      };
    }
    publishedAt = current.published_at;
  }

  const firstPublished = wantsPublished && !publishedAt;
  if (firstPublished) publishedAt = new Date().toISOString();

  const fields = {
    slug,
    title,
    excerpt,
    content,
    published: wantsPublished,
    published_at: publishedAt,
  };

  const result = id
    ? await admin.from("blog_posts").update(fields).eq("id", id).select("id").maybeSingle()
    : await admin
        .from("blog_posts")
        .insert({ ...fields, author_id: user.id })
        .select("id")
        .single();

  if (result.error) {
    if (result.error.code === "23505") {
      return {
        status: "error",
        message: "Esiste già un articolo con questo indirizzo (slug): scegline un altro.",
      };
    }
    return {
      status: "error",
      message: isMissingTableError(result.error)
        ? "Il blog non è ancora attivo nel database: esegui la migrazione 2026-10-17_blog.sql."
        : SAVE_FAILED,
    };
  }
  if (!result.data) {
    return { status: "error", message: "L'articolo non esiste più." };
  }

  if (!id) {
    redirect(`/admin/blog/${result.data.id}?creato=1`);
  }

  return {
    status: "success",
    message: wantsPublished
      ? "Articolo salvato e visibile agli utenti."
      : "Bozza salvata: l'articolo non è visibile agli utenti.",
    saved: {
      id: result.data.id,
      slug,
      title,
      excerpt,
      content,
      published: wantsPublished,
      firstPublished,
    },
  };
}

/** Pubblica o nasconde un articolo dall'elenco. */
export async function setBlogPostPublished(
  id: string,
  published: boolean
): Promise<{ ok: boolean; message: string }> {
  if (!(await currentAdmin())) return { ok: false, message: NOT_AUTHORIZED };
  if (!UUID_REGEX.test(id)) return { ok: false, message: "Identificativo non valido." };

  const admin = createAdminClient();
  const { data: current, error } = await admin
    .from("blog_posts")
    .select("content, published_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !current) {
    return { ok: false, message: "Articolo non trovato." };
  }
  if (published && !hasReadableContent(String(current.content ?? ""))) {
    return { ok: false, message: "L'articolo è ancora vuoto: scrivilo prima di pubblicarlo." };
  }

  const { error: updateError } = await admin
    .from("blog_posts")
    .update({
      published,
      published_at: current.published_at ?? (published ? new Date().toISOString() : null),
    })
    .eq("id", id);
  if (updateError) return { ok: false, message: SAVE_FAILED };

  return {
    ok: true,
    message: published ? "Articolo pubblicato." : "Articolo nascosto agli utenti.",
  };
}

export async function deleteBlogPost(
  id: string
): Promise<{ ok: boolean; message: string }> {
  if (!(await currentAdmin())) return { ok: false, message: NOT_AUTHORIZED };
  if (!UUID_REGEX.test(id)) return { ok: false, message: "Identificativo non valido." };

  const admin = createAdminClient();
  const { error } = await admin.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, message: "Eliminazione non riuscita. Riprova." };
  return { ok: true, message: "Articolo eliminato." };
}

/** Immagini dell'articolo (stesso bucket e stessi controlli dei quiz). */
export async function uploadBlogImage(
  formData: FormData
): Promise<UploadImageResult> {
  if (!(await currentAdmin())) return { ok: false, message: NOT_AUTHORIZED };
  return uploadPublicImage(formData.get("file"), "blog");
}

export type LinkablePost = { id: string; slug: string; title: string };

/**
 * Ricerca degli articoli pubblicati per il pulsante "Collega un articolo"
 * dell'editor delle spiegazioni. Senza testo restituisce i più recenti.
 */
export async function searchBlogPostsForLink(
  query: string
): Promise<{ ok: true; posts: LinkablePost[] } | { ok: false; message: string }> {
  if (!(await currentAdmin())) return { ok: false, message: NOT_AUTHORIZED };

  const term = sanitizeSearchTerm(String(query ?? ""), 80);
  const admin = createAdminClient();
  let request = admin
    .from("blog_posts")
    .select("id, slug, title")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);
  if (term) request = request.ilike("title", `%${term}%`);

  const { data, error } = await request;
  if (error) {
    return {
      ok: false,
      message: isMissingTableError(error)
        ? "Il blog non è ancora attivo nel database."
        : "Ricerca non riuscita. Riprova.",
    };
  }
  return { ok: true, posts: (data ?? []) as LinkablePost[] };
}
