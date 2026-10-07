import type { ReactNode } from "react";
import { LogoFull } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-12 sm:py-16">
      <LogoFull className="mx-auto mb-8 w-36 sm:w-40" priority />
      {children}
    </div>
  );
}
