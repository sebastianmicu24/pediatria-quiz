import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Registrati",
  description:
    "Crea il tuo account gratuito su Quiz Pediatria e inizia subito ad allenarti.",
};

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Crea il tuo account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Gratuito, in meno di un minuto. Nessuna carta di credito.
      </p>

      <SignupForm />

      <p className="mt-6 text-sm text-slate-600">
        Hai già un account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 underline underline-offset-2"
        >
          Accedi
        </Link>
      </p>
    </>
  );
}
