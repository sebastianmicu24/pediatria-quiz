"use client";

import { useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  searchBlogPostsForLink,
  type LinkablePost,
} from "@/app/(app)/admin/blog/actions";

type SearchResult = {
  query: string;
  posts: LinkablePost[];
  error: string | null;
};

const MAX_LABEL = 150;

/**
 * Pannello per scegliere l'articolo del blog da collegare con un pulsante
 * nella spiegazione di un quiz. Cerca tra gli articoli pubblicati e
 * permette di cambiare il testo del pulsante prima di inserirlo.
 *
 * Sta dentro il modulo dell'editor: Invio non deve mai inviarlo.
 */
export function BlogLinkPicker({
  onPick,
  onClose,
}: {
  onPick: (choice: { slug: string; label: string }) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<LinkablePost | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    searchBlogPostsForLink(debounced)
      .then((response) => {
        if (cancelled) return;
        setResult(
          response.ok
            ? { query: debounced, posts: response.posts, error: null }
            : { query: debounced, posts: [], error: response.message }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          query: debounced,
          posts: [],
          error: "Errore di rete durante la ricerca.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const loading = result === null || result.query !== debounced;

  function choose(post: LinkablePost) {
    setSelected(post);
    setLabel(post.title.slice(0, MAX_LABEL));
  }

  function confirm() {
    const text = label.replace(/\s+/g, " ").trim();
    if (!selected || !text) return;
    onPick({ slug: selected.slug, label: text });
  }

  return (
    <div
      className="space-y-3 border-b border-neutral-200 bg-brand-50/40 px-3 py-3"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-800">
          Collega un articolo del blog
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200/70"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {selected ? (
        <div className="space-y-2.5">
          <p className="text-xs text-neutral-600">
            Articolo: <strong className="text-neutral-900">{selected.title}</strong>{" "}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="font-medium text-brand-700 underline underline-offset-2"
            >
              Cambia
            </button>
          </p>
          <div className="space-y-1">
            <label
              htmlFor="blog-link-label"
              className="block text-xs font-medium text-neutral-700"
            >
              Testo del pulsante
            </label>
            <input
              id="blog-link-label"
              value={label}
              maxLength={MAX_LABEL}
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirm();
                }
              }}
              className={cn(fieldClass, "border-neutral-300")}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={label.trim().length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Inserisci pulsante
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Cerca per titolo…"
              aria-label="Cerca un articolo del blog"
              maxLength={80}
              className={cn(fieldClass, "border-neutral-300 pl-9")}
              autoFocus
            />
          </div>

          <div aria-live="polite">
            {loading ? (
              <p className="flex items-center gap-2 py-2 text-xs text-neutral-500">
                <Spinner className="h-3.5 w-3.5" /> Ricerca in corso…
              </p>
            ) : result?.error ? (
              <p className="py-2 text-xs font-medium text-rose-700">{result.error}</p>
            ) : result && result.posts.length === 0 ? (
              <p className="py-2 text-xs text-neutral-500">
                {debounced
                  ? "Nessun articolo pubblicato corrisponde alla ricerca."
                  : "Non ci sono ancora articoli pubblicati."}
              </p>
            ) : (
              <ul className="max-h-52 divide-y divide-neutral-100 overflow-y-auto rounded-md border border-neutral-200 bg-white">
                {result?.posts.map((post) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      onClick={() => choose(post)}
                      className="block w-full px-3 py-2 text-left text-sm text-neutral-800 transition-colors hover:bg-brand-50"
                    >
                      {post.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-neutral-500">
            Compaiono solo gli articoli pubblicati. Il pulsante si apre in una
            nuova scheda, così l&apos;esercitazione dell&apos;utente non si
            interrompe.
          </p>
        </div>
      )}
    </div>
  );
}
