import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { NavActions } from "@/components/nav-actions";

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
        <NavActions
          isLoggedIn={Boolean(user)}
          isAdmin={isAdminEmail(user?.email)}
        />
      </nav>
    </header>
  );
}
