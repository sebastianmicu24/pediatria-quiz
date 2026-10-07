import { LogoWordmark } from "@/components/logo";

export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <LogoWordmark />
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-8 w-20 animate-pulse rounded-lg bg-slate-200/70" />
          <span className="h-9 w-32 animate-pulse rounded-xl bg-slate-200/70" />
        </div>
      </div>
    </header>
  );
}
