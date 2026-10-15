import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CookieContent } from "@/content/legal/cookie";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Quali cookie utilizza pediatro.me: solo cookie tecnici necessari all'autenticazione, nessun tracciamento.",
};

export default function CookiePage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={`Questa pagina descrive, ai sensi dell'art. 122 del D.Lgs. 196/2003 e delle Linee guida del Garante Privacy del 10 giugno 2021, quali cookie e tecnologie simili utilizza ${LEGAL.siteName}.`}
    >
      <CookieContent />
    </LegalPage>
  );
}
