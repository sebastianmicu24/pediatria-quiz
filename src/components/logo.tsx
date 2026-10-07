import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Marchio Pediatroma: bimbo con stetoscopio e Colosseo,
 * in rosso imperiale romano su bianco.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={72}
      height={72}
      className={cn("h-9 w-9 shrink-0", className)}
      aria-hidden="true"
    />
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo className="h-9 w-9" />
      <span className="text-[17px] font-semibold tracking-tight text-slate-900">
        Pediatroma
      </span>
    </span>
  );
}

/**
 * Logo esteso con wordmark "pediatro.me" e tagline:
 * usato in hero, footer e pagine di accesso.
 */
export function LogoFull({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo-full.png"
      alt="Pediatro.me — Quiz per un domani più grande"
      width={176}
      height={176}
      priority={priority}
      className={cn("h-auto w-40", className)}
    />
  );
}
