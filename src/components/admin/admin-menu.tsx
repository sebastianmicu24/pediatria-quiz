"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronDown, Pencil, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResetOnHide } from "@/lib/use-reset-on-hide";

const ADMIN_LINKS = [
  {
    href: "/admin",
    label: "Gestione quiz",
    description: "Modifica e rimuovi le domande",
    icon: Pencil,
  },
  {
    href: "/statistiche",
    label: "Statistiche",
    description: "Esiti aggregati degli studenti",
    icon: BarChart3,
  },
  {
    href: "/admin/utenti",
    label: "Utenti",
    description: "Schede, andamento e verifiche",
    icon: Users,
  },
] as const;

/**
 * Voce "Admin" del menu: apre una tendina con le pagine di
 * amministrazione (gestione quiz, statistiche, utenti).
 */
export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Al ritorno sulla pagina la tendina non deve restare aperta.
  useResetOnHide(() => setOpen(false));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active =
    pathname.startsWith("/admin") || pathname.startsWith("/statistiche");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
          open || active
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        Admin
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  isActive ? "bg-brand-50" : "hover:bg-slate-50"
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    isActive ? "text-brand-700" : "text-slate-400"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      isActive ? "text-brand-900" : "text-slate-800"
                    )}
                  >
                    {link.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {link.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
