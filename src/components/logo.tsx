import { cn } from "@/lib/utils";

/**
 * Marchio Pediatroma: un arco romano attraversato da una linea ECG.
 * Roma + pediatria, in un'unica forma minimale.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        {/* Arco romano */}
        <path
          d="M6.5 18.8v-7.3a5.5 5.5 0 0 1 11 0v7.3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Battito */}
        <path
          d="M8.6 14.1h1.3l1-2.3 1.9 4.6 1.2-3.1h1.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Basamento */}
        <path
          d="M5.2 19.6h13.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <span className="text-[17px] font-semibold tracking-tight text-slate-900">
        Pediatroma
        <span className="text-orange-500" aria-hidden="true">
          .
        </span>
      </span>
    </span>
  );
}
