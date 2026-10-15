import { cn } from "@/lib/utils";

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-l-2 border-neutral-300 py-1 pl-4 text-xs leading-relaxed text-neutral-500",
        className
      )}
      role="note"
    >
      <strong className="font-semibold text-neutral-700">Avviso medico.</strong>{" "}
      I contenuti di pediatro.me hanno finalità esclusivamente informative e
      didattiche. Non costituiscono consulenza medica e non sostituiscono il
      giudizio clinico, le linee guida ufficiali o il parere di un
      professionista sanitario.
    </div>
  );
}
