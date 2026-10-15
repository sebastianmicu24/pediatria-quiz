import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PrivacyPolicyContent } from "@/content/legal/privacy";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) per gli utenti di pediatro.me.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`La presente informativa è resa ai sensi degli articoli 13 e 14 del Regolamento UE 2016/679 ("GDPR") e del D.Lgs. 196/2003 e s.m.i. ("Codice Privacy") e descrive come ${LEGAL.siteName} tratta i dati personali degli utenti del servizio.`}
    >
      <PrivacyPolicyContent />
    </LegalPage>
  );
}
