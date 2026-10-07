import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizLoader } from "./quiz-loader";
import { QuizSkeleton } from "./quiz-skeleton";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Allenati con le domande di pediatria.",
  robots: { index: false, follow: false },
};

export default function QuizPage(props: PageProps<"/quiz">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
      <Suspense fallback={<QuizSkeleton />}>
        <QuizLoader searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
