"use client";

import Link from "next/link";
import { BadgeCheck, Search } from "lucide-react";
import { isVerifiedTag, statusLabel, yearLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
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

/** Link a una pagina dell'elenco mantenendo la ricerca attiva. */
function pageHref(target: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (target > 1) params.set("page", String(target));
  const search = params.toString();
  return search ? `/admin/utenti?${search}` : "/admin/utenti";
}

/**
 * Elenco utenti. Ricerca e paginazione sono lato server (l'URL contiene
 * q e page): prima il browser riceveva tutti gli utenti e li filtrava.
 */
export function AdminUsersManager({
  users,
  allTags,
  total,
  page,
  pageCount,
  query,
}: {
  users: AdminUser[];
  allTags: string[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
}) {
  return (
    <div>
      <form
        method="get"
        action="/admin/utenti"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Cerca per nome, email, città o scuola…"
            aria-label="Cerca utenti"
            className={`${fieldClass} border-neutral-300 pl-9`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" size="sm">
            Cerca
          </Button>
          {query ? (
            <ButtonLink href="/admin/utenti" variant="ghost" size="sm">
              Azzera
            </ButtonLink>
          ) : null}
          <p className="text-sm tabular-nums text-neutral-500">
            {users.length} di {total} utenti
          </p>
        </div>
      </form>

      {users.length === 0 ? (
        <EmptyState className="mt-4">Nessun utente trovato.</EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {users.map((user) => {
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

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          {page > 1 ? (
            <ButtonLink
              href={pageHref(page - 1, query)}
              variant="secondary"
              size="sm"
            >
              Precedente
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              Precedente
            </Button>
          )}
          <p className="text-xs text-neutral-500">
            Pagina {page} di {pageCount}
          </p>
          {page < pageCount ? (
            <ButtonLink
              href={pageHref(page + 1, query)}
              variant="secondary"
              size="sm"
            >
              Successiva
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              Successiva
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
