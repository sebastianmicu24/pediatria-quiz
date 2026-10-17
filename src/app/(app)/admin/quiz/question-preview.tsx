"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { RichContent } from "@/components/rich-content";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Anteprima di come l'utente vede la domanda: stesso markup, stessi
 * colori e stessa spiegazione della pagina del quiz. Mostra i valori
 * attualmente nei campi, anche se non ancora salvati.
 */
export function QuestionPreview({
  questionHtml,
  options,
  answerIndex,
  explanationHtml,
  topic,
  difficultyLabel,
  onClose,
}: {
  questionHtml: string;
  options: string[];
  answerIndex: number;
  explanationHtml: string;
  topic: string;
  difficultyLabel: string;
  onClose: () => void;
}) {
  // Cambiando i campi, l'anteprima riparte senza risposta selezionata.
  const fieldsKey = JSON.stringify([
    questionHtml,
    options,
    answerIndex,
    explanationHtml,
  ]);

  return (
    <Panel className="border-brand-200 bg-brand-50/30">
      <PanelHeader
        title="Anteprima per gli utenti"
        description="Così appare la domanda nel quiz, con le modifiche attualmente nei campi (anche se non ancora salvate)."
        action={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Torna a modificare
          </Button>
        }
      />

      <div className="p-5">
        <p className="text-xs text-neutral-500">
          {topic.trim() || "Senza argomento"} · {difficultyLabel}
        </p>

        <PreviewBody
          key={fieldsKey}
          questionHtml={questionHtml}
          options={options}
          answerIndex={answerIndex}
          explanationHtml={explanationHtml}
        />
      </div>
    </Panel>
  );
}

/** Domanda e opzioni cliccabili, con esito e spiegazione come nel quiz. */
function PreviewBody({
  questionHtml,
  options,
  answerIndex,
  explanationHtml,
}: {
  questionHtml: string;
  options: string[];
  answerIndex: number;
  explanationHtml: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Con almeno due opzioni si può rispondere; con i campi ancora vuoti
  // l'anteprima mostra comunque le righe da compilare.
  const shownOptions =
    options.length >= 2
      ? options
      : [...options, ...Array(2 - options.length).fill("")];
  const correct = selected === answerIndex;

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-white">
      <div className="p-5">
        {questionHtml ? (
          <RichContent
            html={questionHtml}
            className="text-[17px] font-medium leading-relaxed text-neutral-900"
          />
        ) : (
          <p className="text-[17px] italic text-neutral-400">
            Il testo della domanda comparirà qui.
          </p>
        )}

        <div
          className="mt-6 space-y-2"
          role="group"
          aria-label="Opzioni di risposta (anteprima)"
        >
          {shownOptions.map((option, index) => {
            const isCorrect = index === answerIndex;
            const isSelected = index === selected;
            const showCorrect = revealed && isCorrect;
            const showWrong = revealed && isSelected && !isCorrect;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (revealed) return;
                  setSelected(index);
                  setRevealed(true);
                }}
                disabled={revealed}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left text-sm transition-colors",
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
                    !revealed && "border border-neutral-300 text-neutral-500",
                    showCorrect && "bg-emerald-600 text-white",
                    showWrong && "bg-red-600 text-white",
                    revealed &&
                      !showCorrect &&
                      !showWrong &&
                      "border border-neutral-200 text-neutral-400"
                  )}
                >
                  {OPTION_LETTERS[index] ?? index + 1}
                </span>
                <span className="flex-1 leading-relaxed">
                  {option || (
                    <span className="italic text-neutral-400">
                      Opzione {OPTION_LETTERS[index] ?? index + 1} da compilare
                    </span>
                  )}
                </span>
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
        <section className="border-t border-neutral-200 bg-neutral-50 p-5">
          <h3
            className={cn(
              "text-sm font-semibold",
              correct ? "text-emerald-800" : "text-red-800"
            )}
          >
            {correct
              ? "Risposta corretta"
              : `Risposta errata. La risposta corretta è ${
                  OPTION_LETTERS[answerIndex] ?? ""
                }) ${options[answerIndex] ?? ""}`}
          </h3>
          {explanationHtml ? (
            <RichContent
              html={explanationHtml}
              className="mt-3 text-sm leading-relaxed text-neutral-700"
            />
          ) : (
            <p className="mt-3 text-sm italic text-neutral-400">
              La spiegazione comparirà qui.
            </p>
          )}
          <p className="mt-4 text-xs text-neutral-500">
            Nell&apos;esercitazione qui c&apos;è il pulsante &laquo;Domanda
            successiva&raquo;.
          </p>
        </section>
      ) : null}

      <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
        {revealed
          ? "Risposta svelata: nell'esercitazione le immagini si aprono a tutto schermo, con zoom e spostamento."
          : "Scegli una risposta per vedere l'esito e la spiegazione, come farebbe un utente."}
      </p>
    </div>
  );
}
