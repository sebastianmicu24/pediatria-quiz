"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { ACCOUNT_HREF, ADMIN_NAV, APP_NAV, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavUser = {
  name: string;
  email: string | null;
  isAdmin: boolean;
};

const itemBase =
  "flex items-center gap-3 border-l-2 py-2 pl-3 pr-3 text-sm transition-colors rounded-r-md";
const itemActive = "border-brand-600 bg-neutral-100 font-medium text-neutral-900";
const itemIdle =
  "border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900";

function NavContent({
  user,
  pathname,
  onNavigate,
}: {
  user: NavUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav
        aria-label="Navigazione principale"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <ul className="space-y-0.5">
          {APP_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(itemBase, active ? itemActive : itemIdle)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-brand-600" : "text-neutral-400"
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.status === "soon" ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                      Presto
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        {user.isAdmin ? (
          <div className="mt-6">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
              Amministrazione
            </p>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const active = isActivePath(pathname, item.href, item.exact);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        itemBase,
                        "pl-3",
                        active ? itemActive : itemIdle
                      )}
                    >
                      <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <Link
          href={ACCOUNT_HREF}
          onClick={onNavigate}
          aria-current={isActivePath(pathname, ACCOUNT_HREF) ? "page" : undefined}
          className={cn(
            "block rounded-md px-3 py-2 transition-colors hover:bg-neutral-50",
            isActivePath(pathname, ACCOUNT_HREF) && "bg-neutral-100"
          )}
        >
          <span className="block truncate text-sm font-medium text-neutral-900">
            {user.name}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {user.email ?? "Il tuo account"}
          </span>
        </Link>
        <LogoutButton className="mt-1 w-full justify-start" />
      </div>
    </>
  );
}

/**
 * Navigazione dell'area riservata: barra laterale fissa su desktop,
 * intestazione con cassetto su mobile.
 */
export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  // Il cassetto è "aperto" solo per la pagina in cui è stato aperto:
  // cambiando pagina si richiude senza bisogno di effetti.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedOn(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-5">
          <Link href="/dashboard" aria-label="pediatro.me — Dashboard">
            <LogoWordmark />
          </Link>
        </div>
        <NavContent user={user} pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
        <Link href="/dashboard" aria-label="pediatro.me — Dashboard">
          <LogoWordmark />
        </Link>
        <button
          type="button"
          onClick={() => setOpenedOn(pathname)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label="Apri il menu"
          className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Chiudi il menu"
            onClick={() => setOpenedOn(null)}
            className="absolute inset-0 bg-neutral-900/40"
          />
          <div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu di navigazione"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 pl-4 pr-2">
              <LogoWordmark />
              <button
                type="button"
                onClick={() => setOpenedOn(null)}
                aria-label="Chiudi il menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavContent
              user={user}
              pathname={pathname}
              onNavigate={() => setOpenedOn(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
