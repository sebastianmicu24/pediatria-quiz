"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search } from "lucide-react";
import { isVerifiedTag, statusLabel, yearLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { UserTagEditor } from "./user-tag-editor";

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

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Nessun utente trovato.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((user) => {
            const verified = user.tags.some(isVerifiedTag);
            return (
              <li
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {user.displayName ?? "Senza nome"}
                      </p>
                      {verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          Verificato
                        </span>
                      ) : null}
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
                  </div>

                  <Link
                    href={`/admin/utenti/${user.id}`}
                    className="shrink-0 text-xs font-medium text-brand-700 underline underline-offset-2"
                  >
                    Apri scheda
                  </Link>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <UserTagEditor
                    userId={user.id}
                    tags={user.tags}
                    allTags={allTags}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
