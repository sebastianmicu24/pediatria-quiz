import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/ui/page";
import { QuizLoader } from "./quiz-loader";
import { QuizSkeleton } from "./quiz-skeleton";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Allenati con le domande di pediatria.",
  robots: { index: false, follow: false },
};

export default function QuizPage(props: PageProps<"/quiz">) {
  return (
    <PageContainer width="narrow">
      <Suspense fallback={<QuizSkeleton />}>
        <QuizLoader searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}
