import { LogoWordmark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { AppNav } from "./app-nav";

/** Legge l'utente (dato dinamico) e passa alla navigazione solo ciò che serve. */
export async function NavLoader() {
  const user = await getCurrentUser();
  const fallbackName = user?.email?.split("@")[0] ?? "Account";

  return (
    <AppNav
      user={{
        name: user?.displayName ?? fallbackName,
        email: user?.email ?? null,
        isAdmin: isAdminEmail(user?.email),
      }}
    />
  );
}

export function NavSkeleton() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-neutral-200 px-5">
          <LogoWordmark />
        </div>
        <div className="space-y-2 px-4 py-5" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-8 animate-pulse rounded-md bg-neutral-100"
            />
          ))}
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-neutral-200 bg-white px-4 lg:hidden">
        <LogoWordmark />
      </header>
    </>
  );
}
