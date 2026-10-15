import type { ReactNode } from "react";
import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { COOKIE_PATH, PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

const footerLink = "hover:text-neutral-900 hover:underline underline-offset-2";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="pediatro.me — Home">
          <LogoWordmark />
        </Link>
      </header>

      <main
        id="contenuto"
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-16 pt-8 sm:pt-14"
      >
        {children}
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <p className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-5 gap-y-1 px-4 py-4 text-xs text-neutral-500">
          <Link href={PRIVACY_PATH} className={footerLink}>
            Privacy
          </Link>
          <Link href={COOKIE_PATH} className={footerLink}>
            Cookie
          </Link>
          <Link href={TERMS_PATH} className={footerLink}>
            Termini
          </Link>
        </p>
      </footer>
    </div>
  );
}
