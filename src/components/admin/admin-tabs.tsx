import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "quiz", href: "/admin", label: "Gestione quiz" },
  { key: "statistiche", href: "/statistiche", label: "Statistiche" },
  { key: "utenti", href: "/admin/utenti", label: "Utenti" },
] as const;

/** Navigazione tra le sezioni del pannello di amministrazione. */
export function AdminTabs({
  active,
}: {
  active: "quiz" | "statistiche" | "utenti";
}) {
  return (
    <nav aria-label="Sezioni amministrazione" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
