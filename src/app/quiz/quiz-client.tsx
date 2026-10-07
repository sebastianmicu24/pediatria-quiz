"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { difficultyLabel } from "@/lib/constants";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { saveQuizAttempt } from "./actions";

type AnswerRecord = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizClient({
  questions,
  meta,
}: {
  questions: Question[];
  meta: { topic: string | null; difficulty: number | null };
}) {
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const total = questions.length;
  const question = questions[index];

  const finishQuiz = useCallback(
    (finalAnswers: AnswerRecord[]) => {
      setFinished(true);
      setSaveState("saving");
      saveQuizAttempt({
        topic: meta.topic,
        difficulty: meta.difficulty,
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
    [meta.topic, meta.difficulty]
  );

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (revealed || finished) return;
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
    },
    [revealed, finished, question]
  );

  const goNext = useCallback(() => {
    if (!revealed || finished) return;
    if (index + 1 >= total) {
      finishQuiz(answers);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }, [revealed, finished, index, total, answers, finishQuiz]);

  // Scorciatoie da tastiera: 1-6 / A-F per rispondere, Invio per proseguire.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (finished) return;
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
  }, [revealed, question, handleSelect, goNext, finished]);

  if (finished) {
    return (
      <QuizResults
        questions={questions}
        answers={answers}
        saveState={saveState}
        onReplay={() => {
          router.refresh();
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const progress = (index + 1) / total;

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
            Domanda {index + 1} di {total}
          </p>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            Esci
          </Link>
        </div>
      </header>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label="Avanzamento del quiz"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <article className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            <Button onClick={goNext} className="w-full sm:w-auto">
              {index + 1 >= total ? "Vedi i risultati" : "Domanda successiva"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
  onReplay,
}: {
  questions: Question[];
  answers: AnswerRecord[];
  saveState: "idle" | "saving" | "saved" | "error";
  onReplay: () => void;
}) {
  const total = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const percent = total > 0 ? correct / total : 0;
  const wrong = answers.filter((a) => !a.isCorrect);
  const questionById = new Map(questions.map((q) => [q.id, q]));

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
          Quiz completato!
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
                  questo quiz.
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
            Rigioca con nuove domande
          </Button>
        </div>
      </section>

      {wrong.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Rivedi le risposte errate ({wrong.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {wrong.map((answer) => {
              const question = questionById.get(answer.questionId);
              if (!question) return null;
              const correctOption = question.options[question.answer_index];
              const yourOption = question.options[answer.selectedIndex];
              return (
                <li
                  key={answer.questionId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-medium leading-relaxed text-slate-900">
                    {question.question}
                  </p>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p className="text-rose-700">
                      <span className="font-medium">La tua risposta:</span>{" "}
                      {yourOption ?? "—"}
                    </p>
                    <p className="text-emerald-700">
                      <span className="font-medium">Risposta corretta:</span>{" "}
                      {correctOption ?? "—"}
                    </p>
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
        </section>
      ) : (
        <Alert variant="success" className="mt-8">
          Nessuna risposta errata: punteggio pieno! 🎉
        </Alert>
      )}
    </div>
  );
}
