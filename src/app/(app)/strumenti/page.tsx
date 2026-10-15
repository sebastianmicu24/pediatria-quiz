import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { Badge } from "@/components/ui/badge";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Strumenti",
  description: "Applicazioni cliniche e di ricerca di pediatro.me.",
  robots: { index: false, follow: false },
};

export default function ToolsPage() {
  return (
    <ComingSoon
      title="Strumenti"
      description="Una raccolta di applicazioni per la clinica e la ricerca, che crescerà nel tempo."
    >
      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">
          Primi strumenti previsti
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
          {TOOLS.map((tool) => (
            <li
              key={tool.slug}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {tool.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  {tool.description}
                </p>
              </div>
              <Badge>{tool.status === "live" ? "Disponibile" : "Previsto"}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </ComingSoon>
  );
}
