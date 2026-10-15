import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Marchio pediatro.me: bimbo con stetoscopio e Colosseo,
 * in rosso imperiale romano su bianco.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={72}
      height={72}
      className={cn("h-8 w-8 shrink-0", className)}
      aria-hidden="true"
    />
  );
}

/** Scritta "pediatro.me" con il suffisso in rosso, come nel logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-neutral-900",
        className
      )}
    >
      pediatro<span className="text-brand-600">.me</span>
    </span>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo />
      <Wordmark />
    </span>
  );
}

/** Logo esteso con wordmark e tagline (pagine dove serve il marchio intero). */
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
      alt="pediatro.me — Quiz per un domani più grande"
      width={176}
      height={176}
      priority={priority}
      className={cn("h-auto w-40", className)}
    />
  );
}
