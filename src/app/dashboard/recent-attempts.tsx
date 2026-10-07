import Link from "next/link";
import { formatDate, formatPercent } from "@/lib/utils";
import { difficultyLabel } from "@/lib/constants";
import type { AttemptSummary } from "@/lib/types";

export function RecentAttempts({ attempts }: { attempts: AttemptSummary[] }) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          Non hai ancora completato nessun quiz. Inizia dal configuratore qui
          sopra!
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {attempts.map((attempt) => {
        const percent =
          attempt.total_questions > 0
            ? attempt.correct_answers / attempt.total_questions
            : 0;
        return (
          <li
            key={attempt.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {attempt.topic ?? "Tutti gli argomenti"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDate(attempt.completed_at)} · Difficoltà{" "}
                {difficultyLabel(attempt.difficulty)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {attempt.correct_answers}/{attempt.total_questions}
              </span>
              <span
                className={
                  percent >= 0.7
                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : percent >= 0.5
                      ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      : "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                }
              >
                {formatPercent(attempt.correct_answers, attempt.total_questions)}
              </span>
            </div>
          </li>
        );
      })}
      <li className="bg-slate-50/60 px-5 py-3 text-right">
        <Link
          href="/account"
          className="text-xs font-medium text-brand-700 underline underline-offset-2"
        >
          Esporta i tuoi dati dalla pagina Account
        </Link>
      </li>
    </ul>
  );
}
