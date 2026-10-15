import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { LEGAL, COOKIE_PATH, PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

const CURRENT_YEAR = new Date().getFullYear();

const linkClass =
  "text-sm text-neutral-600 transition-colors hover:text-neutral-900";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <LogoWordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Quiz di pediatria con spiegazioni e statistiche personali. Da
              Roma, per chi studia e lavora in pediatria.
            </p>
          </div>

          <nav aria-label="Collegamenti utili">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
              Sito
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/" className={linkClass}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/registrati" className={linkClass}>
                  Registrati
                </Link>
              </li>
              <li>
                <Link href="/login" className={linkClass}>
                  Accedi
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Informazioni legali">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
              Legale
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href={PRIVACY_PATH} className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={COOKIE_PATH} className={linkClass}>
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href={TERMS_PATH} className={linkClass}>
                  Termini di servizio
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-500 md:flex-row md:justify-between">
          <p>
            © {CURRENT_YEAR} {LEGAL.siteName} · Titolare del trattamento:{" "}
            {LEGAL.owner} ·{" "}
            <a
              href={`mailto:${LEGAL.email}`}
              className="underline underline-offset-2 hover:text-neutral-900"
            >
              {LEGAL.email}
            </a>
          </p>
          <p className="max-w-md">
            Contenuti a scopo didattico: non costituiscono consulenza medica né
            sostituiscono il giudizio clinico e le linee guida ufficiali.
          </p>
        </div>
      </div>
    </footer>
  );
}
