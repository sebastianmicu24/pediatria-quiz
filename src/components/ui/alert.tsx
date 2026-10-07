import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "error";

const styles: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
};

const icons: Record<AlertVariant, ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
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
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        styles[variant],
        className
      )}
    >
      {icons[variant]}
      <div>{children}</div>
    </div>
  );
}
