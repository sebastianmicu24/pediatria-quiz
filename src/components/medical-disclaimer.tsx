import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5",
        className
      )}
      role="note"
    >
      <Stethoscope
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
        aria-hidden="true"
      />
      <p className="text-xs leading-relaxed text-amber-900">
        <strong>Avviso medico:</strong> i contenuti di Pediatroma hanno
        finalità esclusivamente informative e didattiche. Non costituiscono
        consulenza medica e non sostituiscono il giudizio clinico, le linee
        guida ufficiali o il parere di un professionista sanitario.
      </p>
    </div>
  );
}
