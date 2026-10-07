"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

const mobileLink =
  "block rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-100";

export function NavActions({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-1 md:flex">
        {isLoggedIn ? (
          <>
            <Link href="/dashboard" className={navLink}>
              Dashboard
            </Link>
            <Link href="/quiz" className={navLink}>
              Quiz
            </Link>
            <Link href="/account" className={navLink}>
              Account
            </Link>
            {isAdmin ? (
              <>
                <Link href="/statistiche" className={navLink}>
                  Statistiche
                </Link>
                <Link href="/admin" className={navLink}>
                  Gestione quiz
                </Link>
              </>
            ) : null}
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className={navLink}>
              Accedi
            </Link>
            <Link
              href="/registrati"
              className={cn(buttonStyles("primary", "sm"), "px-4")}
            >
              Registrati gratis
            </Link>
          </>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Chiudi il menu" : "Apri il menu"}
          className="inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {open ? (
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur"
          >
            <nav
              className="mx-auto flex w-full max-w-6xl flex-col gap-1"
              aria-label="Menu di navigazione mobile"
            >
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className={mobileLink} onClick={close}>
                    Dashboard
                  </Link>
                  <Link href="/quiz" className={mobileLink} onClick={close}>
                    Quiz
                  </Link>
                  <Link href="/account" className={mobileLink} onClick={close}>
                    Account
                  </Link>
                  {isAdmin ? (
                    <>
                      <Link
                        href="/statistiche"
                        className={mobileLink}
                        onClick={close}
                      >
                        Statistiche
                      </Link>
                      <Link href="/admin" className={mobileLink} onClick={close}>
                        Gestione quiz
                      </Link>
                    </>
                  ) : null}
                  <div className="px-1 pt-1">
                    <LogoutButton className="h-11 w-full justify-start px-3" />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className={mobileLink} onClick={close}>
                    Accedi
                  </Link>
                  <Link
                    href="/registrati"
                    onClick={close}
                    className={cn(buttonStyles("primary", "md"), "mt-1 w-full")}
                  >
                    Registrati gratis
                  </Link>
                </>
              )}
            </nav>
          </div>
        ) : null}
      </div>
    </>
  );
}
