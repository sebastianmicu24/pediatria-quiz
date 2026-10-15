import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Turni",
  description: "Pianificazione di turni, guardie e rotazioni.",
  robots: { index: false, follow: false },
};

export default function ShiftsPage() {
  return (
    <ComingSoon
      title="Pianificazione dei turni"
      description="Turni, guardie e rotazioni del reparto, assegnati mese per mese."
      points={[
        "Ognuno indica i turni per cui è disponibile nel mese successivo.",
        "Un algoritmo propone l'assegnazione mensile tenendo conto delle disponibilità e dell'equità del carico.",
        "Il calendario risultante è consultabile da tutti gli utenti coinvolti.",
      ]}
    />
  );
}
