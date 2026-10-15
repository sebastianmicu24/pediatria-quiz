import { Badge, scoreTone } from "@/components/ui/badge";
import { difficultyLabel } from "@/lib/constants";
import { formatDate, formatPercent } from "@/lib/utils";
import type { AttemptSummary } from "@/lib/types";

/** Elenco compatto di esercitazioni: argomento, data e punteggio. */
export function AttemptList({ attempts }: { attempts: AttemptSummary[] }) {
  return (
    <ul className="divide-y divide-neutral-100">
      {attempts.map((attempt) => {
        const ratio =
          attempt.total_questions > 0
            ? attempt.correct_answers / attempt.total_questions
            : 0;
        return (
          <li
            key={attempt.id}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">
                {attempt.topic ?? "Argomenti misti"}
              </p>
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {formatDate(attempt.completed_at)}
                {attempt.difficulty != null
                  ? ` · ${difficultyLabel(attempt.difficulty)}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums text-neutral-500">
                {attempt.correct_answers}/{attempt.total_questions}
              </span>
              <Badge tone={scoreTone(ratio)} className="w-12 justify-center tabular-nums">
                {formatPercent(attempt.correct_answers, attempt.total_questions)}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
