"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COUNT_OPTIONS, DEFAULT_QUESTION_COUNT } from "@/lib/constants";

type DifficultyValue = "all" | "1" | "2" | "3";

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "touch-manipulation rounded-full border px-3.5 py-2 text-sm font-medium transition-colors sm:py-1.5",
        selected
          ? "border-brand-600 bg-brand-600 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

export function QuizSetup({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<DifficultyValue>("all");
  const [count, setCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [starting, setStarting] = useState(false);

  function startQuiz() {
    const params = new URLSearchParams();
    if (topic !== "all") params.set("topic", topic);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    params.set("count", String(count));
    setStarting(true);
    router.push(`/quiz?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">
          Argomento
        </legend>

        {/* Mobile: tendina nativa, più comoda con 18 argomenti */}
        <div className="mt-3 sm:hidden">
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            aria-label="Argomento"
            className="block h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="all">Tutti gli argomenti</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop: pillole */}
        <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
          <Pill selected={topic === "all"} onClick={() => setTopic("all")}>
            Tutti
          </Pill>
          {topics.map((t) => (
            <Pill key={t} selected={topic === t} onClick={() => setTopic(t)}>
              {t}
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-slate-900">
          Difficoltà
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill
            selected={difficulty === "all"}
            onClick={() => setDifficulty("all")}
          >
            Tutte
          </Pill>
          <Pill selected={difficulty === "1"} onClick={() => setDifficulty("1")}>
            Base
          </Pill>
          <Pill selected={difficulty === "2"} onClick={() => setDifficulty("2")}>
            Intermedia
          </Pill>
          <Pill selected={difficulty === "3"} onClick={() => setDifficulty("3")}>
            Avanzata
          </Pill>
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-slate-900">
          Numero di domande
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((n) => (
            <Pill key={n} selected={count === n} onClick={() => setCount(n)}>
              {n}
            </Pill>
          ))}
        </div>
      </fieldset>

      <Button onClick={startQuiz} disabled={starting} className="mt-7 w-full sm:w-auto">
        <Play className="h-4 w-4" aria-hidden="true" />
        {starting ? "Preparo il quiz…" : "Inizia il quiz"}
      </Button>
    </div>
  );
}
