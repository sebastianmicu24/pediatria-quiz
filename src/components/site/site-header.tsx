import Link from "next/link";
import { LogoWordmark } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Navigazione principale"
      >
        <Link href="/" aria-label="pediatro.me — Home">
          <LogoWordmark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">{children}</div>
      </nav>
    </header>
  );
}

export function SiteHeaderSkeleton() {
  return <HeaderFrame />;
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <HeaderFrame>
      {user ? (
        <ButtonLink href="/dashboard" size="sm">
          Vai alla dashboard
        </ButtonLink>
      ) : (
        <>
          <ButtonLink href="/login" variant="ghost" size="sm">
            Accedi
          </ButtonLink>
          <ButtonLink href="/registrati" size="sm">
            Registrati
          </ButtonLink>
        </>
      )}
    </HeaderFrame>
  );
}
