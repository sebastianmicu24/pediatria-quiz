"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useResetOnHide } from "@/lib/use-reset-on-hide";
import { QuizFilters, type QuizFilterValues } from "./quiz-filters";

/**
 * Filtri mostrati quando nessuna domanda corrisponde: permettono di
 * cambiarli e ripartire senza passare dalla dashboard.
 */
export function QuizEmptyFilters({
  topics,
  value,
}: {
  topics: string[];
  value: QuizFilterValues;
}) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  useResetOnHide(() => setApplying(false));

  function apply(next: QuizFilterValues) {
    const params = new URLSearchParams();
    for (const topic of next.topics) params.append("topic", topic);
    for (const level of next.difficulties) {
      params.append("difficulty", String(level));
    }
    for (const status of next.statuses) params.append("status", status);
    const search = params.toString();
    setApplying(true);
    router.push(search ? `/quiz?${search}` : "/quiz");
  }

  return (
    <QuizFilters
      topics={[...new Set([...topics, ...value.topics])].sort((a, b) =>
        a.localeCompare(b, "it")
      )}
      value={value}
      applying={applying}
      error={null}
      onApply={apply}
      onCancel={() => router.push("/dashboard")}
    />
  );
}
