"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Search } from "lucide-react";
import { isVerifiedTag, statusLabel, yearLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClass } from "@/components/ui/input";
import { ConfirmEmailButton, UserTagEditor } from "./user-controls";

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
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, email, città o tag…"
            aria-label="Cerca utenti"
            className={`${fieldClass} border-neutral-300 pl-9`}
          />
        </div>
        <p className="text-sm tabular-nums text-neutral-500">
          {filtered.length} di {users.length} utenti
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState className="mt-4">Nessun utente trovato.</EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {filtered.map((user) => {
            const verified = user.tags.some(isVerifiedTag);
            const details = [
              user.status ? statusLabel(user.status) : null,
              user.year ? yearLabel(user.year) : null,
              user.city,
              user.school,
            ].filter(Boolean);
            return (
              <li key={user.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-900">
                        {user.displayName ?? "Senza nome"}
                      </p>
                      {verified ? (
                        <Badge tone="success">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          Verificato
                        </Badge>
                      ) : null}
                      {!user.confirmed ? (
                        <Badge tone="warning">Email non confermata</Badge>
                      ) : null}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {user.email ?? "—"}
                    </p>

                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                      <span>Iscritto {formatDate(user.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {user.lastSignInAt
                          ? `Ultimo accesso ${formatDate(user.lastSignInAt)}`
                          : "Mai entrato"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {user.attempts} esercitazioni
                      </span>
                    </p>

                    {details.length > 0 ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        {details.join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {!user.confirmed ? (
                      <ConfirmEmailButton userId={user.id} />
                    ) : null}
                    <Link
                      href={`/admin/utenti/${user.id}`}
                      className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                    >
                      Apri scheda
                    </Link>
                  </div>
                </div>

                <div className="mt-3 border-t border-neutral-100 pt-3">
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
