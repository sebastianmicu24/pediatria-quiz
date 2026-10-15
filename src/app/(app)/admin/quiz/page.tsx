import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizContent } from "./quiz-content";

export const metadata: Metadata = {
  title: "Quiz · Amministrazione",
  description: "Gestione delle domande di pediatro.me (solo amministratori).",
  robots: { index: false, follow: false },
};

export default function AdminQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse" aria-hidden="true">
          <div className="h-10 rounded-md bg-neutral-200/70" />
          <div className="mt-6 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
