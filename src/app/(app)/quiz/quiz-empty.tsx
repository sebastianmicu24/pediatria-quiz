import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function QuizEmpty({
  variant,
  message,
  children,
}: {
  variant: "error" | "empty";
  message: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <Alert variant={variant === "error" ? "error" : "info"}>{message}</Alert>
      {children}
      <div className="mt-6">
        <ButtonLink href="/dashboard" variant="secondary">
          Torna alla dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
