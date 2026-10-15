import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";
import {
  firstParam,
  parsePage,
  sanitizeSearchTerm,
  type AdminSearchParams,
} from "@/lib/supabase/search-params";
import { Alert } from "@/components/ui/alert";
import { AdminUsersManager, type AdminUser } from "./admin-users-manager";

/** Utenti per pagina: la paginazione avviene nel database. */
const PAGE_SIZE = 25;

/**
 * Colonne dei profili in ordine di completezza: se una migrazione non è
 * ancora applicata (email, anno, tag) si degrada alla variante successiva
 * invece di rompere la pagina.
 */
const PROFILE_SELECTS = [
  {
    columns:
      "id, display_name, email, status, year, school, city, tags, created_at",
    email: true,
    meta: true,
  },
  {
    columns: "id, display_name, status, year, school, city, tags, created_at",
    email: false,
    meta: true,
  },
  {
    columns: "id, display_name, status, school, city, created_at",
    email: false,
    meta: false,
  },
];

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  status: string | null;
  year: string | null;
  school: string | null;
  city: string | null;
  tags: string[];
  created_at: string;
};

function normalizeProfile(
  row: Record<string, unknown>,
  variant: (typeof PROFILE_SELECTS)[number]
): ProfileRow {
  return {
    id: String(row.id),
    display_name: (row.display_name as string | null) ?? null,
    email: variant.email ? ((row.email as string | null) ?? null) : null,
    status: (row.status as string | null) ?? null,
    year: variant.meta ? ((row.year as string | null) ?? null) : null,
    school: (row.school as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    tags: variant.meta && Array.isArray(row.tags) ? row.tags.map(String) : [],
    created_at: String(row.created_at),
  };
}

/**
 * Elenco utenti. Prima la pagina caricava l'intero elenco (Auth Admin API,
 * tutti i profili e tutte le esercitazioni, fino a 50.000 righe) e
 * lasciava al browser ricerca e ordinamento: ora filtri, conteggio e
 * paginazione avvengono nel database.
 */
export async function AdminUsersContent({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const query = sanitizeSearchTerm(firstParam(params.q));
  const page = parsePage(params.page);
  const from = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  function fetchProfiles(variant: (typeof PROFILE_SELECTS)[number]) {
    const list = admin.from("profiles").select(variant.columns, {
      count: "exact",
    });
    const term = `%${query}%`;
    const fields = [
      `display_name.ilike.${term}`,
      `city.ilike.${term}`,
      `school.ilike.${term}`,
    ];
    if (variant.email) fields.push(`email.ilike.${term}`);
    const scoped = query ? list.or(fields.join(",")) : list;
    return scoped
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
  }

  let loadedPage: {
    rows: ProfileRow[];
    total: number;
    hasEmail: boolean;
  } | null = null;
  for (const variant of PROFILE_SELECTS) {
    const { data, count, error } = await fetchProfiles(variant);
    if (!error) {
      const rawRows = (data ?? []) as unknown as Record<string, unknown>[];
      loadedPage = {
        rows: rawRows.map((row) => normalizeProfile(row, variant)),
        total: count ?? rawRows.length,
        hasEmail: variant.email,
      };
      break;
    }
    if (!isMissingColumnError(error.message)) break;
  }

  if (!loadedPage) {
    return (
      <Alert variant="error">
        Impossibile caricare i profili: verifica la configurazione e riprova.
      </Alert>
    );
  }

  const { rows, total, hasEmail } = loadedPage;

  // Email confermata e ultimo accesso non stanno nel profilo: restano
  // nell'Auth Admin API. Sotto i 1000 utenti è una sola chiamata; le
  // pagine successive servono solo con archivi molto grandi.
  const authById = new Map<
    string,
    { email: string | null; lastSignInAt: string | null; confirmed: boolean }
  >();
  for (let authPage = 1; authPage <= 20; authPage++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: authPage,
      perPage: 1000,
    });
    if (error) {
      return (
        <Alert variant="error">
          Impossibile caricare gli utenti registrati: verifica la
          configurazione e riprova.
        </Alert>
      );
    }
    for (const entry of data.users) {
      authById.set(entry.id, {
        email: entry.email ?? null,
        lastSignInAt: entry.last_sign_in_at ?? null,
        confirmed: Boolean(entry.email_confirmed_at),
      });
    }
    if (data.users.length < 1000) break;
  }

  // Esercitazioni: una riga per utente mostrato, non una per tentativo.
  const ids = rows.map((row) => row.id);
  const attemptsByUser = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts, error: countsError } = await admin
      .from("user_attempt_counts")
      .select("user_id, attempts")
      .in("user_id", ids);

    if (!countsError) {
      for (const row of counts ?? []) {
        attemptsByUser.set(String(row.user_id), Number(row.attempts) || 0);
      }
    } else {
      // Migrazione non applicata: conta i tentativi dei soli utenti mostrati.
      const { data: fallback } = await admin
        .from("quiz_attempts")
        .select("user_id")
        .in("user_id", ids);
      for (const row of fallback ?? []) {
        const key = String(row.user_id);
        attemptsByUser.set(key, (attemptsByUser.get(key) ?? 0) + 1);
      }
    }
  }

  // Tag suggeriti per l'editor (i tag sono pochi e manuali).
  const { data: tagRows } = await admin
    .from("profiles")
    .select("tags")
    .limit(2000);
  const allTags = [
    ...new Set(
      (tagRows ?? []).flatMap((row) =>
        Array.isArray(row.tags) ? row.tags.map(String) : []
      )
    ),
  ].sort((a, b) => a.localeCompare(b, "it"));

  const users: AdminUser[] = rows.map((profile) => {
    const auth = authById.get(profile.id);
    return {
      id: profile.id,
      email: profile.email ?? auth?.email ?? null,
      displayName: profile.display_name,
      status: profile.status,
      year: profile.year,
      school: profile.school,
      city: profile.city,
      tags: profile.tags,
      createdAt: profile.created_at,
      lastSignInAt: auth?.lastSignInAt ?? null,
      confirmed: auth?.confirmed ?? true,
      attempts: attemptsByUser.get(profile.id) ?? 0,
    };
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
        {total} utenti {query ? "trovati" : "registrati"}. I tag manuali (es.
        «verificato») servono a organizzarli e sono visibili anche nel loro
        account.
      </p>

      {!hasEmail ? (
        <Alert variant="info" className="mt-4">
          Esegui{" "}
          <code className="rounded bg-white/60 px-1">
            supabase/migrations/2026-10-16_elenchi-admin.sql
          </code>{" "}
          per mostrare e cercare anche le email degli utenti.
        </Alert>
      ) : null}

      <div className="mt-6">
        <AdminUsersManager
          users={users}
          allTags={allTags}
          total={total}
          page={page}
          pageCount={pageCount}
          query={query}
        />
      </div>
    </>
  );
}
