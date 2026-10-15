import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Accedi",
  description: "Accedi al tuo account pediatro.me per continuare ad allenarti.",
};

export default function LoginPage() {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-neutral-900">
        Accedi
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Riprendi da dove avevi lasciato.
      </p>

      <Suspense
        fallback={
          <div className="mt-8 h-72 animate-pulse rounded-lg border border-neutral-200 bg-white" />
        }
      >
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-sm text-neutral-600">
        Non hai ancora un account?{" "}
        <Link
          href="/registrati"
          className="font-medium text-brand-700 underline underline-offset-2"
        >
          Registrati gratis
        </Link>
      </p>
    </>
  );
}
