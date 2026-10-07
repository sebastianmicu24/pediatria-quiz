import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = {
  title: "Reimposta password",
  description: "Imposta una nuova password per il tuo account Quiz Pediatria.",
};

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Imposta una nuova password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Scegli una nuova password per il tuo account. Ti consigliamo di usare
        almeno 8 caratteri.
      </p>

      <UpdatePasswordForm />
    </>
  );
}
