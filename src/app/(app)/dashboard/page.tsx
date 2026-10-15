import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "./dashboard-skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Il tuo punto di partenza: esercitazioni, ripasso e riepilogo.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
