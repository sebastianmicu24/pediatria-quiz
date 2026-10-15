"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Home,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { Question } from "@/lib/types";
import { cn, formatPercent, sanitizeHtml } from "@/lib/utils";
import { EXERCISE_BATCH_SIZE, difficultyLabel } from "@/lib/constants";
import { useResetOnHide } from "@/lib/use-reset-on-hide";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatStrip } from "@/components/ui/stat-strip";
import { fetchQuizBatch, saveQuizAttempt } from "./actions";

type AnswerRecord = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Quando restano così tante domande nel lotto corrente, precarica il
 * prossimo: l'esercitazione continua senza pause fino a "Termina".
 */
const PREFETCH_THRESHOLD = 3;

/**
 * Esercitazione progressiva: una domanda alla volta, con risposta
 * immediata e spiegazione. Nessun set predefinito: si continua finché
 * l'utente non decide di terminare, poi si vede il riepilogo.
 */
export function QuizClient({
  initialQuestions,
  meta,
}: {
  initialQuestions: Question[];
  meta: { topics: string[]; difficulties: number[]; statuses: string[] };
}) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [phase, setPhase] = useState<"active" | "summary">("active");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const phaseRef = useRef<"active" | "summary">("active");
  const loadingRef = useRef(false);
  const pendingAdvanceRef = useRef(false);
  const explanationRef = useRef<HTMLElement | null>(null);

  // Avvia il cronometro dell'esercitazione al montaggio.
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // Se la pagina viene nascosta (navigazione) e poi ripristinata, il
  // caricamento del prossimo lotto non deve restare bloccato.
  useResetOnHide(() => {
    loadingRef.current = false;
    pendingAdvanceRef.current = false;
    setLoadingMore(false);
  });

  const question = questions[index];
  const correctCount = answers.filter((a) => a.isCorrect).length;

  const finish = useCallback(
    (finalAnswers: AnswerRecord[]) => {
      if (phaseRef.current === "summary") return;
      phaseRef.current = "summary";
      setDurationMs(
        startedAtRef.current !== null
          ? Date.now() - startedAtRef.current
          : 0
      );
      setPhase("summary");
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (finalAnswers.length === 0) return;
      setSaveState("saving");
      saveQuizAttempt({
        topic: meta.topics.length === 1 ? meta.topics[0] : null,
        difficulty:
          meta.difficulties.length === 1 ? meta.difficulties[0] : null,
        answers: finalAnswers.map((a) => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex,
        })),
      })
        .then((result) => {
          setSaveState(result.ok ? "saved" : "error");
        })
        .catch(() => {
          setSaveState("error");
        });
    },
    [meta.topics, meta.difficulties]
  );

  const advance = useCallback(() => {
    setSelected(null);
    setRevealed(false);
    setIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /** Richiede il prossimo lotto di domande (esclude quelle già viste). */
  const ensureMore = useCallback(() => {
    if (loadingRef.current || exhausted || phaseRef.current === "summary") {
      return;
    }
    loadingRef.current = true;
    setLoadingMore(true);
    fetchQuizBatch({
      topics: meta.topics,
      difficulties: meta.difficulties,
      statuses: meta.statuses,
      exclude: questions.map((q) => q.id),
      count: EXERCISE_BATCH_SIZE,
    })
      .then((result) => {
        const known = new Set(questions.map((q) => q.id));
        const fresh = result.ok
          ? result.questions.filter((q) => !known.has(q.id))
          : [];

        if (fresh.length === 0) {
          // Archivio esaurito con questi filtri (o errore del server):
          // il pulsante diventa "Concludi esercitazione".
          setExhausted(true);
          return;
        }

        setQuestions((prev) => {
          const have = new Set(prev.map((q) => q.id));
          const added = fresh.filter((q) => !have.has(q.id));
          return added.length > 0 ? [...prev, ...added] : prev;
        });

        // Se l'utente stava aspettando alla fine del lotto, prosegue subito.
        if (pendingAdvanceRef.current && questions.length + fresh.length > index) {
          pendingAdvanceRef.current = false;
          advance();
        }
      })
      .catch(() => {
        // Errore di rete transitorio: verrà ritentato alla prossima
        // richiesta (tasto "Domanda successiva" o prefetch).
      })
      .finally(() => {
        loadingRef.current = false;
        setLoadingMore(false);
      });
  }, [questions, index, meta.topics, meta.difficulties, meta.statuses, exhausted, advance]);

  // Precarica il prossimo lotto quando il corrente è quasi finito.
  useEffect(() => {
    if (phase !== "active") return;
    if (questions.length - index > PREFETCH_THRESHOLD) return;
    ensureMore();
  }, [phase, index, questions.length, ensureMore]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (revealed || phase !== "active") return;
      setSelected(optionIndex);
      setRevealed(true);
      setAnswers((prev) => [
        ...prev,
        {
          questionId: question.id,
          selectedIndex: optionIndex,
          isCorrect: optionIndex === question.answer_index,
        },
      ]);
      // Porta la spiegazione in vista senza nascondere l'opzione scelta.
      requestAnimationFrame(() => {
        explanationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    },
    [revealed, phase, question]
  );

  const goNext = useCallback(() => {
    if (!revealed || phase !== "active") return;
    if (index + 1 < questions.length) {
      advance();
      return;
    }
    if (exhausted) {
      finish(answers);
      return;
    }
    // Fine del lotto: richiedi il prossimo e prosegui appena pronto.
    pendingAdvanceRef.current = true;
    ensureMore();
  }, [revealed, phase, index, questions.length, exhausted, answers, advance, finish, ensureMore]);

  const handleTerminate = useCallback(() => {
    if (answers.length === 0) {
      router.push("/dashboard");
      return;
    }
    finish(answers);
  }, [answers, finish, router]);

  // Scorciatoie da tastiera: 1-6 / A-F per rispondere, Invio per proseguire.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "active") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!revealed) {
        const numeric = Number(event.key);
        if (numeric >= 1 && numeric <= question.options.length) {
          event.preventDefault();
          handleSelect(numeric - 1);
          return;
        }
        const letterIndex = OPTION_LETTERS.indexOf(event.key.toUpperCase());
        if (letterIndex >= 0 && letterIndex < question.options.length) {
          event.preventDefault();
          handleSelect(letterIndex);
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, question, handleSelect, goNext, phase]);

  if (phase === "summary") {
    return (
      <QuizResults
        questions={questions}
        answers={answers}
        saveState={saveState}
        durationMs={durationMs}
        onReplay={() => {
          router.refresh();
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const atEndOfBatch = index + 1 >= questions.length;
  const continueLabel = !atEndOfBatch
    ? "Domanda successiva"
    : loadingMore
      ? "Caricamento…"
      : exhausted
        ? "Concludi esercitazione"
        : "Domanda successiva";

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm font-medium tabular-nums text-neutral-900">
            Domanda {index + 1}
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {question.topic} · {difficultyLabel(question.difficulty)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p
            className="flex items-center gap-3 text-sm font-medium tabular-nums"
            aria-label={`${correctCount} corrette, ${answers.length - correctCount} errate`}
          >
            <span
              className="flex items-center gap-1 text-emerald-700"
              title="Risposte corrette"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {correctCount}
            </span>
            <span
              className="flex items-center gap-1 text-red-700"
              title="Risposte errate"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {answers.length - correctCount}
            </span>
          </p>
          <Button variant="secondary" size="sm" onClick={handleTerminate}>
            Termina
          </Button>
        </div>
      </header>

      <article className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="p-5 sm:p-7">
          <div
            className="rich-text text-[17px] font-medium leading-relaxed text-neutral-900 sm:text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.question) }}
          />

          <div
            className="mt-6 space-y-2"
            role="group"
            aria-label="Opzioni di risposta"
          >
            {question.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === question.answer_index;
              const isSelected = optionIndex === selected;
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => handleSelect(optionIndex)}
                  disabled={revealed}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full touch-manipulation items-center gap-3 rounded-md border px-3.5 py-3.5 text-left text-sm transition-colors sm:py-3",
                    !revealed &&
                      "border-neutral-300 bg-white hover:border-neutral-900 hover:bg-neutral-50",
                    showCorrect &&
                      "border-emerald-600 bg-emerald-50 text-emerald-950",
                    showWrong && "border-red-600 bg-red-50 text-red-950",
                    revealed &&
                      !showCorrect &&
                      !showWrong &&
                      "border-neutral-200 bg-white text-neutral-500"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold",
                      !revealed &&
                        "border border-neutral-300 text-neutral-500",
                      showCorrect && "bg-emerald-600 text-white",
                      showWrong && "bg-red-600 text-white",
                      revealed &&
                        !showCorrect &&
                        !showWrong &&
                        "border border-neutral-200 text-neutral-400"
                    )}
                  >
                    {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{option}</span>
                  {showCorrect ? (
                    <CheckCircle2
                      className="h-5 w-5 shrink-0 text-emerald-600"
                      aria-label="Risposta corretta"
                    />
                  ) : null}
                  {showWrong ? (
                    <XCircle
                      className="h-5 w-5 shrink-0 text-red-600"
                      aria-label="Risposta errata"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {revealed ? (
          <section
            ref={explanationRef}
            className="border-t border-neutral-200 bg-neutral-50 p-5 sm:p-7"
          >
            <h2
              className={cn(
                "text-sm font-semibold",
                selected === question.answer_index
                  ? "text-emerald-800"
                  : "text-red-800"
              )}
            >
              {selected === question.answer_index
                ? "Risposta corretta"
                : `Risposta errata. La risposta corretta è ${
                    OPTION_LETTERS[question.answer_index] ?? ""
                  }) ${question.options[question.answer_index] ?? ""}`}
            </h2>
            {question.explanation ? (
              <div
                className="rich-text mt-3 text-sm leading-relaxed text-neutral-700"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(question.explanation),
                }}
              />
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="hidden text-xs text-neutral-500 sm:block">
                <kbd className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 font-sans">
                  Invio
                </kbd>{" "}
                per continuare
              </p>
              <Button
                onClick={goNext}
                disabled={atEndOfBatch && loadingMore}
                className="w-full sm:w-auto"
              >
                {atEndOfBatch && loadingMore ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {continueLabel}
              </Button>
            </div>
          </section>
        ) : null}
      </article>

      {revealed ? null : (
        <p className="mt-3 hidden text-xs text-neutral-400 sm:block">
          Rispondi con il mouse o con i tasti 1–{question.options.length}.
        </p>
      )}
    </>
  );
}

function QuizResults({
  questions,
  answers,
  saveState,
  durationMs,
  onReplay,
}: {
  questions: Question[];
  answers: AnswerRecord[];
  saveState: "idle" | "saving" | "saved" | "error";
  durationMs: number;
  onReplay: () => void;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const percent = total > 0 ? correct / total : 0;
  const wrong = answers.filter((a) => !a.isCorrect);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const [reviewFilter, setReviewFilter] = useState<"errori" | "tutte">(
    wrong.length > 0 ? "errori" : "tutte"
  );
  const shown = reviewFilter === "errori" ? wrong : answers;

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  const durationLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const message =
    percent >= 0.85
      ? "Eccellente! Preparazione solida."
      : percent >= 0.65
        ? "Buon lavoro! C'è ancora margine di miglioramento."
        : percent >= 0.45
          ? "Base discreta, ma serve altro ripasso."
          : "Non scoraggiarti: rileggi le spiegazioni e riprova.";

  const filterButton = (active: boolean) =>
    cn(
      "touch-manipulation px-3.5 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-neutral-900 text-white"
        : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
    );

  return (
    <div>
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
          Esercitazione terminata
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          {total > 0
            ? `${correct} risposte corrette su ${total}`
            : "Nessuna risposta data"}
        </h1>
        <p className="mt-2 text-base text-neutral-600">{message}</p>
      </header>

      <StatStrip
        className="mt-8"
        items={[
          { label: "Precisione", value: formatPercent(correct, total) },
          { label: "Corrette", value: String(correct) },
          { label: "Errate", value: String(total - correct) },
          { label: "Tempo", value: durationLabel, hint: "minuti : secondi" },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          {saveState === "saving" ? (
            <p className="flex items-center gap-2 text-neutral-500">
              <Spinner className="h-3.5 w-3.5" /> Salvataggio dei risultati…
            </p>
          ) : saveState === "saved" ? (
            <p className="text-neutral-500">
              Risultati salvati nelle tue statistiche.
            </p>
          ) : saveState === "error" ? (
            <p className="font-medium text-amber-700">
              Risultati non salvati: le statistiche potrebbero non includere
              questa esercitazione.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={onReplay}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuova esercitazione
          </Button>
          <ButtonLink href="/dashboard" variant="primary">
            <Home className="h-4 w-4" aria-hidden="true" />
            Torna alla dashboard
          </ButtonLink>
        </div>
      </div>

      {total > 0 ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-neutral-900">
              Rivedi le tue risposte
            </h2>
            {wrong.length > 0 ? (
              <div className="inline-flex divide-x divide-neutral-300 overflow-hidden rounded-md border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setReviewFilter("tutte")}
                  aria-pressed={reviewFilter === "tutte"}
                  className={filterButton(reviewFilter === "tutte")}
                >
                  Tutte ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("errori")}
                  aria-pressed={reviewFilter === "errori"}
                  className={filterButton(reviewFilter === "errori")}
                >
                  Solo errori ({wrong.length})
                </button>
              </div>
            ) : null}
          </div>

          <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {shown.map((answer) => {
              const question = questionById.get(answer.questionId);
              if (!question) return null;
              const isCorrect = answer.isCorrect;
              const yourOption = question.options[answer.selectedIndex];
              const correctOption = question.options[question.answer_index];

              return (
                <li key={answer.questionId} className="p-5">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-label="Risposta corretta"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                        aria-label="Risposta errata"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="rich-text text-sm font-medium leading-relaxed text-neutral-900"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(question.question),
                        }}
                      />
                      <div className="mt-3 space-y-1 text-sm">
                        <p className={isCorrect ? "text-emerald-800" : "text-red-800"}>
                          <span className="font-medium">La tua risposta:</span>{" "}
                          {OPTION_LETTERS[answer.selectedIndex]}) {yourOption}
                        </p>
                        {isCorrect ? null : (
                          <p className="text-emerald-800">
                            <span className="font-medium">Risposta corretta:</span>{" "}
                            {OPTION_LETTERS[question.answer_index]}) {correctOption}
                          </p>
                        )}
                      </div>
                      {question.explanation ? (
                        <details className="group mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-brand-700 underline underline-offset-2">
                            Mostra la spiegazione
                          </summary>
                          <div
                            className="rich-text mt-2 border-l-2 border-neutral-200 pl-3 text-sm leading-relaxed text-neutral-600"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(question.explanation),
                            }}
                          />
                        </details>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {wrong.length === 0 ? (
            <Alert variant="success" className="mt-6">
              Nessuna risposta errata: punteggio pieno.
            </Alert>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
