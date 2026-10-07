import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TextField({
  label,
  id,
  error,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  id: string;
  error?: string | null;
  hint?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "block h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          error ? "border-rose-400" : "border-slate-300"
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  id,
  error,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: ReactNode;
  id: string;
  error?: string | null;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <label htmlFor={id} className="text-sm leading-snug text-slate-600">
          {label}
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
