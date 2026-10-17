"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Elementi della barra degli strumenti condivisi dagli editor admin. */

export function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden="true" />;
}

export function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  expanded,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  expanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70 disabled:opacity-40",
        active && "bg-brand-100 text-brand-800"
      )}
    >
      {children}
    </button>
  );
}
