"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { deleteQuestion } from "@/app/(app)/admin/quiz/actions";
import { cn, stripHtml } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Azioni dell'amministratore sulla domanda mostrata nel quiz: il pulsante
 * apre la domanda nell'editor, la freccia apre il menu con l'eliminazione.
 * Il componente viene renderizzato solo per gli amministratori (allowlist
 * ADMIN_EMAILS): per tutti gli altri la pagina resta identica a prima.
 */
export function QuizAdminActions({
  questionId,
  questionText,
  onDeleted,
  onError,
}: {
  questionId: string;
  /** Testo della domanda, per riconoscerla nel messaggio di conferma. */
  questionText: string;
  /** Il quiz toglie dall'esercitazione la domanda appena eliminata. */
  onDeleted: () => void;
  /** Errore da mostrare nella pagina (avviso rosso sopra la domanda). */
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Il menu si chiude con un clic fuori o con Esc, come i menu del browser.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: Event) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleDelete() {
    if (deleting) return;
    const preview = stripHtml(questionText).slice(0, 90);
    const confirmed = window.confirm(
      `Eliminare definitivamente questa domanda?\n\n"${preview}…"\n\nLa domanda sparisce dal quiz e dalle statistiche; le risposte storiche collegate vengono rimosse (i punteggi dei quiz già completati restano invariati). L'operazione non può essere annullata.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await deleteQuestion(questionId);
      if (!result.ok) {
        onError(result.message);
        return;
      }
      setOpen(false);
      onDeleted();
    } catch {
      onError("Eliminazione non riuscita. Riprova.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex">
      <ButtonLink
        href={`/admin/quiz?edit=${questionId}`}
        variant="secondary"
        size="sm"
        target="_blank"
        title="Apri questa domanda nell'editor"
        className="rounded-r-none"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Modifica
      </ButtonLink>
      <Button
        variant="secondary"
        size="sm"
        className="rounded-l-none border-l-0 px-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Altre azioni sulla domanda"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Azioni sulla domanda"
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {deleting ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {deleting ? "Eliminazione…" : "Elimina quiz"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
