"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { DIFFICULTY_OPTIONS, REVIEW_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";

export type QuizFilterValues = {
  topics: string[];
  difficulties: number[];
  statuses: string[];
};

/** Numero di filtri attivi (ogni voce selezionata conta uno). */
export function countFilters(filters: QuizFilterValues): number {
  return (
    filters.topics.length + filters.difficulties.length + filters.statuses.length
  );
}

function sameFilters(a: QuizFilterValues, b: QuizFilterValues): boolean {
  const key = (values: (string | number)[]) =>
    values.map(String).sort().join("\u0000");
  return (
    key(a.topics) === key(b.topics) &&
    key(a.difficulties) === key(b.difficulties) &&
    key(a.statuses) === key(b.statuses)
  );
}

/**
 * Filtri dell'esercitazione modificabili durante il quiz: stessi
 * controlli della dashboard, applicati alle domande successive.
 */
export function QuizFilters({
  topics,
  value,
  applying,
  error,
  onApply,
  onCancel,
}: {
  topics: string[];
  value: QuizFilterValues;
  applying: boolean;
  error: string | null;
  onApply: (next: QuizFilterValues) => void;
  onCancel: () => void;
}) {
  const [draftTopics, setDraftTopics] = useState(value.topics);
  const [draftDifficulties, setDraftDifficulties] = useState(
    value.difficulties.map(String)
  );
  const [draftStatuses, setDraftStatuses] = useState(value.statuses);

  const draft: QuizFilterValues = {
    topics: draftTopics,
    difficulties: draftDifficulties.map(Number),
    statuses: draftStatuses,
  };
  const unchanged = sameFilters(draft, value);

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Filtri dell'esercitazione"
        description="Valgono per le prossime domande: le risposte già date restano nel riepilogo, la domanda non ancora risolta viene sostituita."
      />

      <div className="space-y-5 p-5">
        <MultiSelect
          legend="Argomenti"
          options={topics.map((topic) => ({ value: topic, label: topic }))}
          selected={draftTopics}
          onChange={setDraftTopics}
          allLabel="Tutti gli argomenti"
          searchable
          searchPlaceholder="Cerca argomento…"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <MultiSelect
            legend="Difficoltà"
            options={DIFFICULTY_OPTIONS}
            selected={draftDifficulties}
            onChange={setDraftDifficulties}
            allLabel="Tutte le difficoltà"
          />
          <MultiSelect
            legend="Ripasso"
            options={REVIEW_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            selected={draftStatuses}
            onChange={setDraftStatuses}
            allLabel="Tutte le domande"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p
            role={error ? "alert" : undefined}
            className={
              error
                ? "text-xs font-medium leading-relaxed text-amber-700"
                : "text-xs leading-relaxed text-neutral-500"
            }
          >
            {error ??
              (countFilters(draft) > 0
                ? "Verranno proposte solo le domande che corrispondono ai filtri."
                : "Senza filtri verranno proposte domande da tutti gli argomenti.")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={applying}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
            <Button
              onClick={() => onApply(draft)}
              disabled={applying || unchanged}
              className="w-full sm:w-auto"
            >
              {applying ? (
                <Spinner />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {applying ? "Applico i filtri…" : "Applica filtri"}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
