import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { LEGAL } from "@/lib/legal";
import { COOKIE_PATH, PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

const CURRENT_YEAR = new Date().getFullYear();

const linkClass =
  "text-sm text-slate-500 transition-colors hover:text-slate-900";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <LogoWordmark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              Pediatroma è la palestra dei futuri pediatri: quiz con
              spiegazioni dettagliate, statistiche personali e ripasso
              strutturato per argomento. Da Roma, per chi studia e lavora in
              pediatria.
            </p>
          </div>

          <nav aria-label="Collegamenti utili" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Naviga</h2>
            <ul className="space-y-2">
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

          <nav aria-label="Informazioni legali" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Legale</h2>
            <ul className="space-y-2">
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

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-start sm:justify-between">
          <p>
            © {CURRENT_YEAR} {LEGAL.siteName} — Titolare del trattamento:{" "}
            {LEGAL.owner}
            {" · "}
            <a href={`mailto:${LEGAL.email}`} className="underline hover:text-slate-900">
              {LEGAL.email}
            </a>
          </p>
          <p className="max-w-md">
            I contenuti hanno finalità esclusivamente didattiche e non
            costituiscono consulenza medica: non sostituiscono il giudizio
            clinico né le linee guida ufficiali.
          </p>
        </div>
      </div>
    </footer>
  );
}
