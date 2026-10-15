import { PageContainer } from "@/components/ui/page";

export function DashboardSkeleton() {
  return (
    <PageContainer width="wide">
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-9 w-72 max-w-full rounded bg-neutral-200" />
        <div className="mt-3 h-5 w-96 max-w-full rounded bg-neutral-200/70" />
        <div className="mt-8 h-24 rounded-lg border border-neutral-200 bg-white" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div className="h-96 rounded-lg border border-neutral-200 bg-white" />
          <div className="space-y-8">
            <div className="h-52 rounded-lg border border-neutral-200 bg-white" />
            <div className="h-64 rounded-lg border border-neutral-200 bg-white" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
