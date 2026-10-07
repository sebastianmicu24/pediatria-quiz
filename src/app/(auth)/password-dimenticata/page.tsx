import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm } from "./request-reset-form";

export const metadata: Metadata = {
  title: "Password dimenticata",
  description: "Richiedi un'email per reimpostare la password del tuo account.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Password dimenticata?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Inserisci l&apos;email del tuo account: ti invieremo un link per
        impostare una nuova password.
      </p>

      <RequestResetForm />

      <p className="mt-6 text-sm text-slate-600">
        Ti sei ricordato la password?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 underline underline-offset-2"
        >
          Torna all&apos;accesso
        </Link>
      </p>
    </>
  );
}
