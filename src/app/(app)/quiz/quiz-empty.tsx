import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function QuizEmpty({
  variant,
  message,
}: {
  variant: "error" | "empty";
  message: string;
}) {
  return (
    <div>
      <Alert variant={variant === "error" ? "error" : "info"}>{message}</Alert>
      <div className="mt-6">
        <ButtonLink href="/dashboard" variant="secondary">
          Torna alla dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
