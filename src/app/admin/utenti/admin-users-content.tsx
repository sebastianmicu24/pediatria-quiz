import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { Alert } from "@/components/ui/alert";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminUsersManager, type AdminUser } from "./admin-users-manager";

type ProfileRow = {
  id: string;
  display_name: string | null;
  status: string | null;
  year: string | null;
  school: string | null;
  city: string | null;
  tags: string[] | null;
};

export async function AdminUsersContent() {
  await requireAdmin();

  const admin = createAdminClient();

  // 1. Account registrati (email e date) tramite l'Auth Admin API.
  const authUsers: {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    confirmed: boolean;
  }[] = [];

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
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
      authUsers.push({
        id: entry.id,
        email: entry.email ?? null,
        created_at: entry.created_at,
        last_sign_in_at: entry.last_sign_in_at ?? null,
        confirmed: Boolean(entry.email_confirmed_at),
      });
    }
    if (data.users.length < 1000) break;
  }

  // 2. Profili (dati facoltativi + tag). Se la migrazione anno/tag non è
  // ancora applicata, degrada senza le colonne nuove.
  let profiles: ProfileRow[] = [];
  {
    const withMeta = await fetchAllRows<ProfileRow>(() =>
      admin
        .from("profiles")
        .select("id, display_name, status, year, school, city, tags")
        .order("id", { ascending: true })
    );
    if (!withMeta.error) {
      profiles = withMeta.rows;
    } else {
      const withoutMeta = await fetchAllRows<
        Omit<ProfileRow, "year" | "tags">
      >(() =>
        admin
          .from("profiles")
          .select("id, display_name, status, school, city")
          .order("id", { ascending: true })
      );
      if (withoutMeta.error) {
        return (
          <Alert variant="error">
            Impossibile caricare i profili: verifica la configurazione e
            riprova.
          </Alert>
        );
      }
      profiles = withoutMeta.rows.map((row) => ({
        ...row,
        year: null,
        tags: [],
      }));
    }
  }

  // 3. Esercitazioni svolte per utente (per capire chi è attivo).
  const { rows: attemptRows } = await fetchAllRows<{ user_id: string }>(
    () =>
      admin
        .from("quiz_attempts")
        .select("user_id")
        .order("id", { ascending: true }),
    50_000
  );
  const attemptsByUser = new Map<string, number>();
  for (const row of attemptRows) {
    attemptsByUser.set(row.user_id, (attemptsByUser.get(row.user_id) ?? 0) + 1);
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const users: AdminUser[] = authUsers
    .map((entry) => {
      const profile = profileById.get(entry.id);
      return {
        id: entry.id,
        email: entry.email,
        displayName: profile?.display_name ?? null,
        status: profile?.status ?? null,
        year: profile?.year ?? null,
        school: profile?.school ?? null,
        city: profile?.city ?? null,
        tags: Array.isArray(profile?.tags) ? profile.tags : [],
        createdAt: entry.created_at,
        lastSignInAt: entry.last_sign_in_at,
        confirmed: entry.confirmed,
        attempts: attemptsByUser.get(entry.id) ?? 0,
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const allTags = [...new Set(users.flatMap((user) => user.tags))].sort(
    (a, b) => a.localeCompare(b, "it")
  );

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Utenti
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          {users.length} utenti registrati. Puoi assegnare tag manuali (es.
          «utente verificato») per organizzarli: i tag sono visibili anche nel
          loro account.
        </p>
      </header>

      <div className="mt-6">
        <AdminTabs active="utenti" />
      </div>

      <div className="mt-6">
        <AdminUsersManager users={users} allTags={allTags} />
      </div>
    </>
  );
}
