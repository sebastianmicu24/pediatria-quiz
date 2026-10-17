"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  EXCERPT_MAX,
  SLUG_MAX,
  TITLE_MAX,
  blogPath,
  slugify,
  type AdminBlogPost,
} from "@/lib/blog";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { BlogEditor } from "@/components/admin/blog-editor";
import { ArticleView } from "@/components/blog/article-view";
import { deleteBlogPost, saveBlogPost, type BlogFormState } from "./actions";

const initialState: BlogFormState = { status: "idle", message: "" };
const inputClass = `${fieldClass} border-neutral-300`;

/**
 * Modulo di creazione e modifica di un articolo. Titolo, indirizzo, riassunto
 * e testo viaggiano come campi del modulo; il server li rivalida e
 * sanitizza il testo, quindi quanto mostrato qui non è mai "di fiducia".
 */
export function PostForm({
  post,
  created = false,
}: {
  post: AdminBlogPost | null;
  created?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveBlogPost, initialState);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // Un articolo già esistente conserva il suo indirizzo anche se si cambia
  // il titolo; per uno nuovo l'indirizzo segue il titolo finché non lo si
  // scrive a mano.
  const [slugTouched, setSlugTouched] = useState(post !== null);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Dopo la prima pubblicazione l'indirizzo è bloccato: i link esistenti
  // (anche quelli nei quiz) lo contengono. Il server lo impone comunque.
  const [everPublished, setEverPublished] = useState(Boolean(post?.published_at));
  if (state.saved?.published && !everPublished) setEverPublished(true);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  const snapshot = JSON.stringify([
    title.trim(),
    effectiveSlug,
    excerpt.trim(),
    content,
    published,
  ]);
  // Ultimo stato salvato: serve a sapere se ci sono modifiche non salvate.
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify([
      (post?.title ?? "").trim(),
      post?.slug ?? "",
      (post?.excerpt ?? "").trim(),
      post?.content ?? "",
      post?.published ?? false,
    ])
  );
  const [submitted, setSubmitted] = useState(snapshot);
  const [handledState, setHandledState] = useState(state);
  if (handledState !== state) {
    setHandledState(state);
    if (state.status === "success") setBaseline(submitted);
  }
  const dirty = snapshot !== baseline;

  // Un articolo appena creato arriva con ?creato=1: l'avviso è già
  // mostrato, l'indirizzo torna pulito.
  useEffect(() => {
    if (created && post) {
      window.history.replaceState(null, "", `/admin/blog/${post.id}`);
    }
  }, [created, post]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function leave() {
    if (
      dirty &&
      !window.confirm(
        "Ci sono modifiche non salvate: se esci andranno perse. Uscire?"
      )
    ) {
      return;
    }
    router.push("/admin/blog");
  }

  async function handleDelete() {
    if (!post) return;
    const confirmed = window.confirm(
      `Eliminare definitivamente l'articolo "${post.title}"?\n\nI pulsanti che lo collegano nelle spiegazioni dei quiz smetteranno di funzionare.`
    );
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteBlogPost(post.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      setBaseline(snapshot);
      router.push("/admin/blog");
    } catch {
      setDeleteError("Errore di rete. Riprova.");
    } finally {
      setDeleting(false);
    }
  }

  const saved = state.status === "success" ? state.saved : undefined;
  const liveSlug = saved?.slug ?? post?.slug ?? null;

  return (
    <form
      action={formAction}
      onSubmit={() => setSubmitted(snapshot)}
      className="space-y-6"
    >
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="published" value={published ? "true" : "false"} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={leave}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Torna all&apos;elenco
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {liveSlug && (saved?.published ?? post?.published) ? (
            <ButtonLink
              href={blogPath(liveSlug)}
              size="sm"
              variant="ghost"
              target="_blank"
              rel="noopener"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Apri l&apos;articolo</span>
            </ButtonLink>
          ) : null}
          <Button
            size="sm"
            variant={previewing ? "primary" : "secondary"}
            onClick={() => setPreviewing((value) => !value)}
            aria-expanded={previewing}
            title="Vedi l'articolo come lo vedranno gli utenti"
          >
            {previewing ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {previewing ? "Chiudi anteprima" : "Anteprima"}
          </Button>
        </div>
      </div>

      {created && state.status === "idle" ? (
        <Alert variant="success">
          Articolo creato come bozza. Continua a scrivere e pubblicalo quando è pronto.
        </Alert>
      ) : null}

      {state.status === "success" ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.message}
        </div>
      ) : null}
      {state.status === "error" ? <Alert variant="error">{state.message}</Alert> : null}
      {deleteError ? <Alert variant="error">{deleteError}</Alert> : null}

      {previewing ? (
        <div className="rounded-lg border border-neutral-200 bg-white px-5 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl">
            <ArticleView
              title={title.trim()}
              excerpt={excerpt.trim()}
              content={content}
              publishedAt={post?.published_at ?? new Date().toISOString()}
            />
          </div>
        </div>
      ) : null}

      {/* I campi restano nel modulo anche con l'anteprima aperta:
          `hidden` li toglie solo alla vista, non ai dati inviati. */}
      <div className="space-y-6" hidden={previewing}>
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
            Titolo
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Es. Come riconoscere la bronchiolite"
            className={cn(inputClass, "h-11 font-serif text-lg")}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="slug" className="block text-sm font-medium text-neutral-700">
              Indirizzo (slug)
            </label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-sm text-neutral-500">/blog/</span>
              <input
                id="slug"
                name="slug"
                value={effectiveSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                readOnly={everPublished}
                maxLength={SLUG_MAX}
                aria-describedby="slug-hint"
                className={cn(
                  inputClass,
                  "font-mono",
                  everPublished && "bg-neutral-50 text-neutral-500"
                )}
              />
            </div>
            <p id="slug-hint" className="text-xs text-neutral-500">
              {everPublished
                ? "Bloccato: l'articolo è già stato pubblicato e i link esistenti usano questo indirizzo."
                : "Compare nel link dell'articolo. Dopo la prima pubblicazione non si potrà più cambiare."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="excerpt" className="flex justify-between text-sm font-medium text-neutral-700">
              <span>Riassunto</span>
              <span className="text-xs font-normal tabular-nums text-neutral-400">
                {excerpt.length}/{EXCERPT_MAX}
              </span>
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              maxLength={EXCERPT_MAX}
              rows={3}
              placeholder="Due righe che compaiono nell'elenco degli articoli."
              className={cn(inputClass, "h-auto resize-y py-2 leading-relaxed")}
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-700">Testo</p>
          <BlogEditor id="content" value={content} onChange={setContent} />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-neutral-300 accent-brand-600"
          />
          <span className="text-sm leading-snug text-neutral-700">
            <span className="font-medium text-neutral-900">Pubblicato</span>
            <span className="block text-xs text-neutral-500">
              {published
                ? "Visibile a tutti gli utenti registrati."
                : "Bozza: la vedi solo tu."}
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {post ? (
            <Button
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={handleDelete}
              disabled={deleting || pending}
            >
              {deleting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Elimina
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || deleting} className="w-full sm:w-auto">
            {pending ? (
              <>
                <Spinner /> Salvataggio…
              </>
            ) : post ? (
              "Salva modifiche"
            ) : (
              "Crea articolo"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
