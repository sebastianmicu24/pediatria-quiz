import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "error";

const styles: Record<AlertVariant, string> = {
  info: "border-neutral-300 bg-white text-neutral-800 [&>svg]:text-neutral-500",
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-950 [&>svg]:text-emerald-700",
  error: "border-red-300 bg-red-50 text-red-950 [&>svg]:text-red-700",
};

const icons: Record<AlertVariant, ReactNode> = {
  info: <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  success: (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
  ),
  error: <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
};

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm leading-relaxed",
        styles[variant],
        className
      )}
    >
      {icons[variant]}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
