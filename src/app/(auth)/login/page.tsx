import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Accedi",
  description: "Accedi al tuo account Pediatroma per continuare ad allenarti.",
};

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Bentornato!
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Accedi per riprendere da dove avevi lasciato.
      </p>

      <Suspense
        fallback={
          <div className="mt-8 h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        }
      >
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-sm text-slate-600">
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
