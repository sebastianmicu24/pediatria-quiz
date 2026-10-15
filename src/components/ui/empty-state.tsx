import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-neutral-300 px-6 py-8 text-center",
        className
      )}
    >
      {title ? (
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
      ) : null}
      <p
        className={cn(
          "mx-auto max-w-md text-sm leading-relaxed text-neutral-500",
          title && "mt-1"
        )}
      >
        {children}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
