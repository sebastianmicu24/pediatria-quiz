import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4"
        aria-label="Navigazione principale"
      >
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <LogoWordmark />
        </Link>

        {user ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Link href="/dashboard" className={navLink}>
              Dashboard
            </Link>
            <Link href="/quiz" className={navLink}>
              Quiz
            </Link>
            <Link href="/account" className={cn(navLink, "hidden sm:inline-flex")}>
              Account
            </Link>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className={navLink}>
              Accedi
            </Link>
            <Link
              href="/registrati"
              className={cn(buttonStyles("primary", "sm"), "px-4")}
            >
              Registrati gratis
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
