import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = {
  title: "Reimposta password",
  description: "Imposta una nuova password per il tuo account pediatro.me.",
};

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-neutral-900">
        Imposta una nuova password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Scegli una nuova password per il tuo account. Ti consigliamo di usare
        almeno 8 caratteri.
      </p>

      <UpdatePasswordForm />
    </>
  );
}
