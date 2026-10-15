/**
 * Registro degli strumenti della sezione "Strumenti" (/strumenti).
 *
 * Ogni strumento avrà la propria pagina in `src/app/(app)/strumenti/<slug>`.
 * Per aggiungerne uno: inserisci una voce qui e passa `status` a "live"
 * quando la pagina è pronta; l'elenco in /strumenti si aggiorna da solo.
 */
export type ToolEntry = {
  slug: string;
  name: string;
  description: string;
  status: "live" | "planned";
};

export const TOOLS: ToolEntry[] = [
  {
    slug: "segmentatore-cellulare",
    name: "Segmentatore e classificatore cellulare",
    description:
      "Segmentazione automatica delle cellule in immagini microscopiche e classificazione per tipo.",
    status: "planned",
  },
  {
    slug: "genogramma",
    name: "Costruttore di genogrammi clinici",
    description:
      "Disegno guidato dell'albero genealogico clinico, con simbologia standard e esportazione.",
    status: "planned",
  },
];
