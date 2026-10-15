import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/ui/page";

/**
 * Segnaposto per le sezioni pianificate ma non ancora disponibili.
 * Quando una sezione è pronta si sostituisce questo componente con la
 * pagina vera (e si passa lo `status` della voce di menu a "live").
 */
export function ComingSoon({
  title,
  description,
  points,
  children,
}: {
  title: string;
  description: string;
  points?: string[];
  children?: ReactNode;
}) {
  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="In arrivo"
        title={title}
        description={description}
        actions={<Badge>Non ancora disponibile</Badge>}
      />

      {points && points.length > 0 ? (
        <section className="mt-10 border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-semibold text-neutral-900">
            Cosa è previsto
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {children}
    </PageContainer>
  );
}
