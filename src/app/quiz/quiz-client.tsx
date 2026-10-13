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
  meta: { topics: string[]; difficulties: number[] };
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
  }, [questions, index, meta.topics, meta.difficulties, exhausted, advance]);

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {question.topic}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {difficultyLabel(question.difficulty)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-slate-500">
            Domanda {index + 1}
          </p>
          <p className="flex items-center gap-2.5 text-sm font-semibold">
            <span
              className="flex items-center gap-1 text-emerald-700"
              title="Risposte corrette"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {correctCount}
            </span>
            <span
              className="flex items-center gap-1 text-rose-700"
              title="Risposte errate"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {answers.length - correctCount}
            </span>
          </p>
          <button
            type="button"
            onClick={handleTerminate}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            Termina
          </button>
        </div>
      </header>

      <article className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div
          className="rich-text text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.question) }}
        />

        <div
          className="mt-6 space-y-2.5"
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
                  "flex w-full touch-manipulation items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm transition-colors sm:py-3.5",
                  !revealed &&
                    "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50/40",
                  showCorrect &&
                    "border-emerald-400 bg-emerald-50 text-emerald-950",
                  showWrong && "border-rose-400 bg-rose-50 text-rose-950",
                  revealed &&
                    !showCorrect &&
                    !showWrong &&
                    "border-slate-200 bg-white opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                    !revealed && "border-slate-300 bg-slate-50 text-slate-500",
                    showCorrect &&
                      "border-emerald-400 bg-emerald-100 text-emerald-800",
                    showWrong && "border-rose-400 bg-rose-100 text-rose-800",
                    revealed &&
                      !showCorrect &&
                      !showWrong &&
                      "border-slate-200 bg-slate-50 text-slate-400"
                  )}
                >
                  {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                </span>
                <span className="flex-1 leading-relaxed">{option}</span>
                {showCorrect ? (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : null}
                {showWrong ? (
                  <XCircle
                    className="h-5 w-5 shrink-0 text-rose-600"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </article>

      {revealed ? (
        <section
          ref={explanationRef}
          className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2
            className={cn(
              "text-sm font-semibold",
              selected === question.answer_index
                ? "text-emerald-700"
                : "text-rose-700"
            )}
          >
            {selected === question.answer_index
              ? "Risposta corretta!"
              : `Risposta errata. La risposta corretta è: ${
                  OPTION_LETTERS[question.answer_index] ?? ""
                }) ${question.options[question.answer_index] ?? ""}`}
          </h2>
          {question.explanation ? (
            <div
              className="rich-text mt-3 text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(question.explanation),
              }}
            />
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="hidden text-xs text-slate-400 sm:block">
              Premi <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-sans">Invio</kbd> per
              continuare
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
      ) : (
        <p className="mt-4 text-center text-xs text-slate-400">
          Seleziona una risposta — puoi usare i tasti 1–
          {question.options.length} della tastiera
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

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div>
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Esercitazione completata!
        </h1>
        <p className="mt-2 text-base text-slate-600">{message}</p>
      </header>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-14">
          <div className="relative h-32 w-32 sm:h-36 sm:w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={percent >= 0.7 ? "#10b981" : percent >= 0.5 ? "#f59e0b" : "#f43f5e"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${circumference * percent} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">
                {formatPercent(correct, total)}
              </span>
              <span className="text-xs text-slate-500">precisione</span>
            </div>
          </div>

          <dl className="space-y-3 text-center sm:text-left">
            <div>
              <dt className="text-sm text-slate-500">Risposte corrette</dt>
              <dd className="text-xl font-semibold text-emerald-700">
                {correct} / {total}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Risposte errate</dt>
              <dd className="text-xl font-semibold text-rose-700">
                {total - correct}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Tempo di esercitazione</dt>
              <dd className="text-xl font-semibold text-slate-700">
                {durationLabel}
              </dd>
            </div>
            <div className="pt-1">
              {saveState === "saving" ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Spinner className="h-3.5 w-3.5" /> Salvataggio risultati…
                </p>
              ) : saveState === "saved" ? (
                <p className="text-xs font-medium text-emerald-700">
                  Risultati salvati nelle tue statistiche.
                </p>
              ) : saveState === "error" ? (
                <p className="text-xs font-medium text-amber-700">
                  Risultati non salvati: le statistiche potrebbero non includere
                  questa esercitazione.
                </p>
              ) : null}
            </div>
          </dl>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" variant="primary">
            <Home className="h-4 w-4" aria-hidden="true" />
            Torna alla dashboard
          </ButtonLink>
          <Button variant="secondary" onClick={onReplay}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Nuova esercitazione
          </Button>
        </div>
      </section>

      {total > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Rivedi le tue risposte
            </h2>
            {wrong.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReviewFilter("tutte")}
                  aria-pressed={reviewFilter === "tutte"}
                  className={cn(
                    "touch-manipulation rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    reviewFilter === "tutte"
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  )}
                >
                  Tutte ({total})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("errori")}
                  aria-pressed={reviewFilter === "errori"}
                  className={cn(
                    "touch-manipulation rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    reviewFilter === "errori"
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  )}
                >
                  Solo errori ({wrong.length})
                </button>
              </div>
            ) : null}
          </div>

          <ul className="mt-4 space-y-3">
            {shown.map((answer) => {
              const question = questionById.get(answer.questionId);
              if (!question) return null;
              const isCorrect = answer.isCorrect;
              const yourOption = question.options[answer.selectedIndex];
              const correctOption = question.options[question.answer_index];

              return (
                <li
                  key={answer.questionId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    {isCorrect ? (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className="rich-text flex-1 text-sm font-medium leading-relaxed text-slate-900"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(question.question),
                      }}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    {isCorrect ? (
                      <p className="text-emerald-700">
                        <span className="font-medium">La tua risposta:</span>{" "}
                        {OPTION_LETTERS[answer.selectedIndex]} {yourOption}
                      </p>
                    ) : (
                      <>
                        <p className="text-rose-700">
                          <span className="font-medium">La tua risposta:</span>{" "}
                          {OPTION_LETTERS[answer.selectedIndex]} {yourOption}
                        </p>
                        <p className="text-emerald-700">
                          <span className="font-medium">Risposta corretta:</span>{" "}
                          {OPTION_LETTERS[question.answer_index]} {correctOption}
                        </p>
                      </>
                    )}
                  </div>
                  {question.explanation ? (
                    <details className="group mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-brand-700 underline underline-offset-2">
                        Mostra la spiegazione
                      </summary>
                      <div
                        className="rich-text mt-2 text-xs leading-relaxed text-slate-600"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(question.explanation),
                        }}
                      />
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {wrong.length === 0 ? (
            <Alert variant="success" className="mt-6">
              Nessuna risposta errata: punteggio pieno! 🎉
            </Alert>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
