"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn, stripHtml } from "@/lib/utils";
import { difficultyLabel, formatNumber } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { fieldClass } from "@/components/ui/input";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  deleteQuestion,
  updateQuestion,
  type QuestionFormState,
} from "./actions";

export type AdminQuestion = {
  id: string;
  source_id: string;
  question: string;
  options: string[];
  answer_index: number;
  topic: string;
  difficulty: number;
  explanation: string;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const inputClass = `${fieldClass} border-neutral-300`;

type AutoEdit = "first" | "last" | null;

/**
 * Link a una pagina dell'elenco mantenendo i filtri attivi. Con `edit`
 * la pagina si apre direttamente sull'editor della prima o dell'ultima
 * domanda (usato dai tasti "Quiz successivo/precedente").
 */
function pageHref(
  target: number,
  query: string,
  topic: string,
  edit?: Exclude<AutoEdit, null>
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (topic) params.set("topic", topic);
  if (target > 1) params.set("page", String(target));
  if (edit) params.set("edit", edit);
  const search = params.toString();
  return search ? `/admin/quiz?${search}` : "/admin/quiz";
}

/**
 * Elenco delle domande. Ricerca, filtro e paginazione sono lato server
 * (l'URL contiene q, topic e page): il browser riceve solo la pagina
 * corrente, non l'intero archivio.
 */
export function AdminQuizManager({
  questions,
  topics,
  total,
  page,
  pageSize,
  pageCount,
  query,
  topic,
  autoEdit,
}: {
  questions: AdminQuestion[];
  topics: string[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  query: string;
  topic: string;
  autoEdit: AutoEdit;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(() => {
    if (!autoEdit || questions.length === 0) return null;
    return (autoEdit === "first" ? questions[0] : questions[questions.length - 1])
      .id;
  });
  // Domande salvate in questa sessione: si sovrappongono all'elenco del
  // server, così "successivo/precedente" mostra subito i valori nuovi
  // senza rileggere la pagina (e senza riordinare l'elenco mentre si lavora).
  const [saved, setSaved] = useState<Record<string, AdminQuestion>>({});
  const listStaleRef = useRef(false);
  const [navigating, startNavigation] = useTransition();
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = useMemo(
    () => questions.map((item) => saved[item.id] ?? item),
    [questions, saved]
  );
  const currentIndex = editingId
    ? items.findIndex((item) => item.id === editingId)
    : -1;
  const editing = currentIndex >= 0 ? items[currentIndex] : null;
  const hasPrevious = currentIndex > 0 || (currentIndex === 0 && page > 1);
  const hasNext =
    currentIndex >= 0 &&
    (currentIndex < items.length - 1 || page < pageCount);

  // Arrivati qui da un cambio di pagina: l'editor è già aperto, l'URL
  // torna pulito e la vista riparte dall'alto.
  useEffect(() => {
    if (!autoEdit) return;
    window.history.replaceState(null, "", pageHref(page, query, topic));
    window.scrollTo({ top: 0 });
  }, [autoEdit, page, query, topic]);

  function closeEditor() {
    setEditingId(null);
    if (listStaleRef.current) {
      listStaleRef.current = false;
      setNotice({ type: "success", message: "Domanda aggiornata correttamente." });
      router.refresh();
    }
  }

  function goTo(direction: 1 | -1) {
    if (currentIndex < 0 || navigating) return;
    const target = currentIndex + direction;
    if (target >= 0 && target < items.length) {
      setEditingId(items[target].id);
      window.scrollTo({ top: 0 });
      return;
    }
    // Confine della pagina: si carica la pagina vicina e si apre
    // l'editor sulla prima/ultima domanda.
    if (direction === 1 && page < pageCount) {
      startNavigation(() =>
        router.push(pageHref(page + 1, query, topic, "first"))
      );
    } else if (direction === -1 && page > 1) {
      startNavigation(() =>
        router.push(pageHref(page - 1, query, topic, "last"))
      );
    }
  }

  async function handleDelete(item: AdminQuestion) {
    const preview = stripHtml(item.question).slice(0, 90);
    const confirmed = window.confirm(
      `Eliminare definitivamente questa domanda?\n\n"${preview}…"\n\nLe risposte storiche collegate verranno rimosse; i punteggi dei quiz già completati restano invariati.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setNotice(null);
    const result = await deleteQuestion(item.id);
    setDeletingId(null);

    if (!result.ok) {
      setNotice({ type: "error", message: result.message });
      return;
    }
    setNotice({ type: "success", message: "Domanda eliminata." });
    router.refresh();
  }

  if (editing) {
    return (
      <QuestionEditor
        key={editing.id}
        question={editing}
        topics={topics}
        position={(page - 1) * pageSize + currentIndex + 1}
        total={total}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        navigating={navigating}
        onPrevious={() => goTo(-1)}
        onNext={() => goTo(1)}
        onClose={closeEditor}
        onSaved={(next) => {
          listStaleRef.current = true;
          setSaved((prev) => ({ ...prev, [next.id]: next }));
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <Alert variant={notice.type === "success" ? "success" : "error"}>
          {notice.message}
        </Alert>
      ) : null}

      <form
        method="get"
        action="/admin/quiz"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Cerca nel testo della domanda, nell'argomento o nell'ID…"
            aria-label="Cerca domande"
            className={cn(inputClass, "pl-10")}
          />
        </div>
        <select
          name="topic"
          defaultValue={topic}
          aria-label="Filtra per argomento"
          className={cn(inputClass, "sm:w-64")}
        >
          <option value="">Tutti gli argomenti</option>
          {topics.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Cerca
        </Button>
        {query || topic ? (
          <ButtonLink href="/admin/quiz" variant="ghost">
            Azzera
          </ButtonLink>
        ) : null}
      </form>

      <p className="text-xs text-neutral-500">
        {formatNumber(total)} domande trovate
        {pageCount > 1 ? ` · pagina ${page} di ${pageCount}` : ""}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          Nessuna domanda corrisponde ai filtri.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-relaxed text-neutral-900">
                  {stripHtml(item.question)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <Badge tone="brand">
                    {item.topic}
                  </Badge>
                  <span>{difficultyLabel(item.difficulty)}</span>
                  <span className="truncate">
                    Risposta:{" "}
                    <strong className="text-emerald-700">
                      {OPTION_LETTERS[item.answer_index]}){" "}
                      {item.options[item.answer_index] ?? "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(item.id);
                    setNotice(null);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Modifica
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label="Elimina domanda"
                >
                  {deletingId === item.id ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <ButtonLink
              href={pageHref(page - 1, query, topic)}
              variant="secondary"
              size="sm"
            >
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
            <ButtonLink
              href={pageHref(page + 1, query, topic)}
              variant="secondary"
              size="sm"
            >
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

const initialFormState: QuestionFormState = { status: "idle", message: "" };

function QuestionEditor({
  question,
  topics,
  position,
  total,
  hasPrevious,
  hasNext,
  navigating,
  onPrevious,
  onNext,
  onClose,
  onSaved,
}: {
  question: AdminQuestion;
  topics: string[];
  position: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  navigating: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onSaved: (saved: AdminQuestion) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateQuestion,
    initialFormState
  );
  const [questionHtml, setQuestionHtml] = useState(question.question);
  const [explanationHtml, setExplanationHtml] = useState(question.explanation);
  const [options, setOptions] = useState<string[]>(question.options);
  const [answerIndex, setAnswerIndex] = useState(question.answer_index);
  const [topicValue, setTopicValue] = useState(question.topic);
  const [difficultyValue, setDifficultyValue] = useState(
    String(question.difficulty)
  );

  // Istantanea dei campi: serve a sapere se ci sono modifiche non salvate
  // prima di passare a un'altra domanda.
  const snapshot = JSON.stringify([
    questionHtml,
    explanationHtml,
    options,
    answerIndex,
    topicValue.trim(),
    difficultyValue,
  ]);
  const baselineRef = useRef(
    JSON.stringify([
      question.question,
      question.explanation,
      question.options,
      question.answer_index,
      question.topic.trim(),
      String(question.difficulty),
    ])
  );
  const submittedRef = useRef(snapshot);
  const handledStateRef = useRef(state);

  // Salvataggio riuscito: la nuova istantanea diventa il riferimento e
  // l'elenco riceve i valori salvati.
  useEffect(() => {
    if (handledStateRef.current === state) return;
    handledStateRef.current = state;
    if (state.status === "success" && state.saved) {
      baselineRef.current = submittedRef.current;
      onSaved({ ...question, ...state.saved });
    }
  }, [state, question, onSaved]);

  function leave(action: () => void) {
    if (
      snapshot !== baselineRef.current &&
      !window.confirm(
        "Ci sono modifiche non salvate: se prosegui andranno perse. Continuare?"
      )
    ) {
      return;
    }
    action();
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setAnswerIndex((prev) => {
      if (index === prev) return 0;
      return index < prev ? prev - 1 : prev;
    });
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  }

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submittedRef.current = snapshot;
      }}
      className="space-y-6"
    >
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="question" value={questionHtml} />
      <input type="hidden" name="explanation" value={explanationHtml} />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => leave(onClose)}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Torna all&apos;elenco
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <p className="max-w-full truncate text-xs tabular-nums text-neutral-500">
            Quiz {formatNumber(position)} di {formatNumber(total)}
            <span className="text-neutral-400"> · ID: {question.source_id}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => leave(onPrevious)}
              disabled={!hasPrevious || navigating}
              aria-label="Quiz precedente"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Precedente</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => leave(onNext)}
              disabled={!hasNext || navigating}
            >
              Quiz successivo
              {navigating ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {state.status === "success" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {state.message}
          </p>
          {hasNext ? (
            <Button
              type="button"
              size="sm"
              onClick={() => leave(onNext)}
              disabled={navigating}
            >
              Quiz successivo
              {navigating ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <RichTextEditor
        id="question"
        label="Domanda"
        value={questionHtml}
        onChange={setQuestionHtml}
        hint="Formatta il testo e allinea paragrafi e immagini (sinistra, centro, destra, giustificato). Puoi inserire immagini tra i paragrafi: incolla o trascina un'immagine per caricarla."
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-neutral-700">
          Opzioni di risposta (da 2 a 6)
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                index === answerIndex
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-neutral-300 bg-neutral-50 text-neutral-500"
              )}
              aria-hidden="true"
            >
              {OPTION_LETTERS[index] ?? index + 1}
            </span>
            <input
              name="options"
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              maxLength={300}
              placeholder={`Opzione ${OPTION_LETTERS[index] ?? index + 1}`}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
              aria-label={`Rimuovi opzione ${OPTION_LETTERS[index] ?? index + 1}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {options.length < 6 ? (
          <button
            type="button"
            onClick={addOption}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Aggiungi opzione
          </button>
        ) : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="answer_index"
            className="block text-sm font-medium text-neutral-700"
          >
            Risposta corretta
          </label>
          <select
            id="answer_index"
            name="answer_index"
            value={answerIndex}
            onChange={(event) =>
              setAnswerIndex(Number.parseInt(event.target.value, 10))
            }
            className={inputClass}
          >
            {options.map((_, index) => (
              <option key={index} value={index}>
                {OPTION_LETTERS[index] ?? index + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-neutral-700"
          >
            Argomento
          </label>
          <input
            id="topic"
            name="topic"
            list="admin-topics"
            value={topicValue}
            onChange={(event) => setTopicValue(event.target.value)}
            maxLength={80}
            className={inputClass}
          />
          <datalist id="admin-topics">
            {topics.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium text-neutral-700"
          >
            Difficoltà
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={difficultyValue}
            onChange={(event) => setDifficultyValue(event.target.value)}
            className={inputClass}
          >
            <option value="1">Base</option>
            <option value="2">Intermedia</option>
            <option value="3">Avanzata</option>
          </select>
        </div>
      </div>

      <RichTextEditor
        id="explanation"
        label="Spiegazione"
        value={explanationHtml}
        onChange={setExplanationHtml}
        hint="Compare dopo la risposta dell'utente. Puoi formattare e allineare il testo e inserire immagini (PNG, JPG o WebP) tra i paragrafi."
      />

      <Alert variant="info">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Le modifiche sono visibili immediatamente a tutti gli utenti e i
          punteggi dei prossimi quiz useranno la nuova risposta corretta.
        </span>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <>
              <Spinner /> Salvataggio…
            </>
          ) : (
            "Salva modifiche"
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => leave(onNext)}
          disabled={!hasNext || navigating}
          className="w-full sm:w-auto"
        >
          Quiz successivo
          {navigating ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => leave(onClose)}
          className="w-full sm:w-auto"
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
