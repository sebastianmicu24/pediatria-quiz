"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Search, Tag, X } from "lucide-react";
import { addUserTag, removeUserTag } from "./actions";
import { statusLabel, yearLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string | null;
  year: string | null;
  school: string | null;
  city: string | null;
  tags: string[];
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  attempts: number;
};

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

export function AdminUsersManager({
  users,
  allTags,
}: {
  users: AdminUser[];
  allTags: string[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [
        user.email,
        user.displayName,
        user.city,
        user.school,
        user.tags.join(" "),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [users, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, email, città o tag…"
            aria-label="Cerca utenti"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filtered.length} di {users.length} utenti
        </p>
      </div>

      <datalist id="tag-suggeriti">
        {allTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Nessun utente trovato.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((user) => (
            <li
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {user.displayName ?? "Senza nome"}
                </p>
                {!user.confirmed ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Email non confermata
                  </span>
                ) : null}
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {user.email ?? "—"}
              </p>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>Iscritto {formatDate(user.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {user.lastSignInAt
                    ? `Ultimo accesso ${formatDate(user.lastSignInAt)}`
                    : "Mai entrato"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{user.attempts} esercitazioni</span>
              </p>

              {user.status || user.year || user.city || user.school ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                  {user.status ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {statusLabel(user.status)}
                    </span>
                  ) : null}
                  {user.year ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {yearLabel(user.year)}
                    </span>
                  ) : null}
                  {user.city ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {user.city}
                    </span>
                  ) : null}
                  {user.school ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {user.school}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                {user.tags.map((tag) => (
                  <form key={tag} action={removeUserTag}>
                    <input type="hidden" name="user_id" value={user.id} />
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
                  <input type="hidden" name="user_id" value={user.id} />
                  <input
                    name="tag"
                    list="tag-suggeriti"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
