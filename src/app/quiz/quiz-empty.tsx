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
    <div className="text-center">
      <Alert
        variant={variant === "error" ? "error" : "info"}
        className="text-left"
      >
        {message}
      </Alert>
      <div className="mt-8 flex justify-center">
        <ButtonLink href="/dashboard" variant="secondary">
          Torna alla dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
