import { PageContainer } from "@/components/ui/page";

export function AccountSkeleton() {
  return (
    <PageContainer width="default">
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-9 w-40 rounded bg-neutral-200" />
        <div className="mt-3 h-5 w-80 max-w-full rounded bg-neutral-200/70" />
        <div className="mt-8 space-y-8 border-t border-neutral-200 pt-8">
          <div className="h-72 rounded-lg border border-neutral-200 bg-white" />
          <div className="h-32 rounded-lg border border-neutral-200 bg-white" />
        </div>
      </div>
    </PageContainer>
  );
}
