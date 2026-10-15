"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { DIFFICULTY_LABELS, REVIEW_OPTIONS } from "@/lib/constants";
import { useResetOnHide } from "@/lib/use-reset-on-hide";

/** Filtro difficoltà: le etichette vivono in `DIFFICULTY_LABELS`. */
const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function QuizSetup({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    []
  );
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  // Se l'utente naviga via e poi torna indietro, il pulsante non deve
  // restare bloccato in "Preparo l'esercitazione…".
  useResetOnHide(() => setStarting(false));

  function startQuiz() {
    if (starting) return;
    const params = new URLSearchParams();
    for (const topic of selectedTopics) params.append("topic", topic);
    for (const difficulty of selectedDifficulties) {
      params.append("difficulty", difficulty);
    }
    for (const status of selectedReviews) params.append("status", status);
    setStarting(true);
    const query = params.toString();
    router.push(query ? `/quiz?${query}` : "/quiz");
  }

  const hasFilters =
    selectedTopics.length + selectedDifficulties.length + selectedReviews.length >
    0;

  return (
    <Panel>
      <PanelHeader
        title="Nuova esercitazione"
        description="Le domande arrivano una alla volta, con la spiegazione subito dopo la risposta. Termini quando vuoi."
      />

      <div className="space-y-5 p-5">
        <MultiSelect
          legend="Argomenti"
          options={topics.map((topic) => ({ value: topic, label: topic }))}
          selected={selectedTopics}
          onChange={setSelectedTopics}
          allLabel="Tutti gli argomenti"
          searchable
          searchPlaceholder="Cerca argomento…"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <MultiSelect
            legend="Difficoltà"
            options={DIFFICULTY_OPTIONS}
            selected={selectedDifficulties}
            onChange={setSelectedDifficulties}
            allLabel="Tutte le difficoltà"
          />
          <MultiSelect
            legend="Ripasso"
            options={REVIEW_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            selected={selectedReviews}
            onChange={setSelectedReviews}
            allLabel="Tutte le domande"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-neutral-500">
            {hasFilters
              ? "Verranno proposte solo le domande che corrispondono ai filtri."
              : "Senza filtri verranno proposte domande da tutti gli argomenti."}
          </p>
          <Button
            onClick={startQuiz}
            disabled={starting}
            className="w-full shrink-0 sm:w-auto"
          >
            {starting ? (
              <Spinner />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {starting ? "Preparo l'esercitazione…" : "Inizia"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
