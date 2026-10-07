"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn, stripHtml } from "@/lib/utils";
import { difficultyLabel } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

const PAGE_SIZE = 20;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const inputClass =
  "block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export function AdminQuizManager({
  questions,
  topics,
}: {
  questions: AdminQuestion[];
  topics: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (topicFilter !== "all" && item.topic !== topicFilter) return false;
      if (!query) return true;
      return (
        stripHtml(item.question).toLowerCase().includes(query) ||
        item.topic.toLowerCase().includes(query)
      );
    });
  }, [questions, search, topicFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const current = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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
        question={editing}
        topics={topics}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setNotice({
            type: "success",
            message: "Domanda aggiornata correttamente.",
          });
          router.refresh();
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cerca nel testo della domanda o nell'argomento…"
            aria-label="Cerca domande"
            className={cn(inputClass, "pl-10")}
          />
        </div>
        <select
          value={topicFilter}
          onChange={(event) => {
            setTopicFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filtra per argomento"
          className={cn(inputClass, "sm:w-64")}
        >
          <option value="all">Tutti gli argomenti ({questions.length})</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} domande trovate
        {totalPages > 1 ? ` · pagina ${safePage} di ${totalPages}` : ""}
      </p>

      {current.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Nessuna domanda corrisponde ai filtri.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {current.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-relaxed text-slate-900">
                  {stripHtml(item.question)}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-800">
                    {item.topic}
                  </span>
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
                    setEditing(item);
                    setNotice(null);
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            Precedente
          </Button>
          <p className="text-xs text-slate-500">
            Pagina {safePage} di {totalPages}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
          >
            Successiva
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const initialFormState: QuestionFormState = { status: "idle", message: "" };

function QuestionEditor({
  question,
  topics,
  onClose,
  onSaved,
}: {
  question: AdminQuestion;
  topics: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateQuestion,
    initialFormState
  );
  const [questionHtml, setQuestionHtml] = useState(question.question);
  const [explanationHtml, setExplanationHtml] = useState(question.explanation);
  const [options, setOptions] = useState<string[]>(question.options);
  const [answerIndex, setAnswerIndex] = useState(question.answer_index);

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
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={question.id} />
      <input type="hidden" name="question" value={questionHtml} />
      <input type="hidden" name="explanation" value={explanationHtml} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Torna all&apos;elenco
        </button>
        <p className="max-w-full truncate text-xs text-slate-400">
          ID: {question.source_id}
        </p>
      </div>

      {state.status === "success" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {state.message}
          </p>
          <Button type="button" size="sm" onClick={onSaved}>
            Chiudi e aggiorna l&apos;elenco
          </Button>
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
        hint="Testo formattabile: grassetto, corsivo ed elenchi."
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">
          Opzioni di risposta (da 2 a 6)
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                index === answerIndex
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-slate-50 text-slate-500"
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
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
            className="block text-sm font-medium text-slate-700"
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
            className="block text-sm font-medium text-slate-700"
          >
            Argomento
          </label>
          <input
            id="topic"
            name="topic"
            list="admin-topics"
            defaultValue={question.topic}
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
            className="block text-sm font-medium text-slate-700"
          >
            Difficoltà
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={String(question.difficulty)}
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
        hint="Compare dopo la risposta dell'utente. Grassetto, corsivo ed elenchi."
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
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
