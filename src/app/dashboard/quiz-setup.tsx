"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Spinner } from "@/components/ui/spinner";
import { useResetOnHide } from "@/lib/use-reset-on-hide";

const DIFFICULTY_OPTIONS = [
  { value: "1", label: "Base" },
  { value: "2", label: "Intermedia" },
  { value: "3", label: "Avanzata" },
];

export function QuizSetup({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(
    []
  );
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
    setStarting(true);
    const query = params.toString();
    router.push(query ? `/quiz?${query}` : "/quiz");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <MultiSelect
        legend="Argomenti"
        options={topics.map((topic) => ({ value: topic, label: topic }))}
        selected={selectedTopics}
        onChange={setSelectedTopics}
        allLabel="Tutti gli argomenti"
        searchable
        searchPlaceholder="Cerca argomento…"
      />

      <div className="mt-6">
        <MultiSelect
          legend="Difficoltà"
          options={DIFFICULTY_OPTIONS}
          selected={selectedDifficulties}
          onChange={setSelectedDifficulties}
          allLabel="Tutte le difficoltà"
        />
      </div>

      <p className="mt-6 text-sm leading-relaxed text-slate-500">
        Puoi selezionare più argomenti e più difficoltà. Le domande arrivano{" "}
        <strong className="font-semibold text-slate-700">una alla volta</strong>
        , con spiegazione immediata: continua finché vuoi e termina quando sei
        soddisfatto.
      </p>

      <Button
        onClick={startQuiz}
        disabled={starting}
        className="mt-4 w-full sm:w-auto"
      >
        {starting ? (
          <Spinner />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {starting ? "Preparo l'esercitazione…" : "Inizia l'esercitazione"}
      </Button>
    </div>
  );
}
