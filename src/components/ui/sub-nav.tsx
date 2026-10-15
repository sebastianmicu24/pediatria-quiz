"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SubNavItem = {
  href: string;
  label: string;
  /** Se true, la voce è attiva solo sul percorso esatto. */
  exact?: boolean;
};

/** Schede di navigazione interne a una sezione (sottolineatura sull'attiva). */
export function SubNav({
  items,
  label,
}: {
  items: SubNavItem[];
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="-mb-px flex gap-6 overflow-x-auto border-b border-neutral-200"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
              active
                ? "border-brand-600 text-neutral-900"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
