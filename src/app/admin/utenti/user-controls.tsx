"use client";

import { useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { BadgeCheck, MailCheck, Tag, X } from "lucide-react";
import { addUserTag, confirmUserEmail, removeUserTag } from "./actions";
import { VERIFIED_TAG } from "@/lib/constants";
import { Spinner } from "@/components/ui/spinner";

function SubmitButton({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} className={className}>
      {pending ? <Spinner className="h-3.5 w-3.5" /> : children}
    </button>
  );
}

/**
 * Gestione dei tag di un utente: chip rimovibili + campo per
 * aggiungerne uno nuovo (con suggerimenti dai tag esistenti).
 */
export function UserTagEditor({
  userId,
  tags,
  allTags,
}: {
  userId: string;
  tags: string[];
  allTags: string[];
}) {
  const listId = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <datalist id={listId}>
        {allTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {tags.map((tag) => (
        <form key={tag} action={removeUserTag}>
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="tag" value={tag} />
          <SubmitButton
            title={`Rimuovi il tag «${tag}»`}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            <Tag className="h-3 w-3" aria-hidden="true" />
            {tag}
            <X className="h-3 w-3" aria-hidden="true" />
          </SubmitButton>
        </form>
      ))}

      <form
        action={addUserTag}
        className="flex w-full items-center gap-2 sm:w-auto"
      >
        <input type="hidden" name="user_id" value={userId} />
        <input
          name="tag"
          list={listId}
          maxLength={40}
          required
          pattern="[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 ._'-]{0,39}"
          title="Lettere, numeri, spazi, punto, trattino o apostrofo (max 40 caratteri)"
          placeholder="Nuovo tag, es. utente verificato"
          aria-label="Nuovo tag"
          className="h-9 w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-64 sm:flex-none"
        />
        <SubmitButton className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
          Aggiungi
        </SubmitButton>
      </form>
    </div>
  );
}

/**
 * Interruttore rapido per lo stato "verificato" (tag convenzionale).
 * In futuro questo stato potrà abilitare permessi particolari.
 */
export function VerifiedToggle({
  userId,
  verified,
}: {
  userId: string;
  verified: boolean;
}) {
  if (verified) {
    return (
      <form action={removeUserTag}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="tag" value={VERIFIED_TAG} />
        <SubmitButton
          title="Rimuovi lo stato di utente verificato"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
        >
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          Verificato — rimuovi
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={addUserTag}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="tag" value={VERIFIED_TAG} />
      <SubmitButton
        title="Segna questo utente come verificato"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60"
      >
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        Segna come verificato
      </SubmitButton>
    </form>
  );
}

/**
 * Conferma manualmente l'email dell'utente (supporto): utile quando
 * non riceve l'email di conferma. Chiede conferma prima di procedere.
 */
export function ConfirmEmailButton({
  userId,
  size = "sm",
}: {
  userId: string;
  size?: "sm" | "md";
}) {
  return (
    <form
      action={confirmUserEmail}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Confermare manualmente l'email di questo utente? Potrà accedere senza cliccare il link di conferma."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <SubmitButton
        title="Conferma manualmente l'email (utile se l'utente non l'ha ricevuta)"
        className={
          size === "md"
            ? "inline-flex h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60"
            : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-60"
        }
      >
        <MailCheck
          className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}
          aria-hidden="true"
        />
        Conferma email
      </SubmitButton>
    </form>
  );
}
