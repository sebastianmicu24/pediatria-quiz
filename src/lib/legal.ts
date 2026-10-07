import { siteUrl } from "@/lib/env";

/**
 * Dati del Titolare del trattamento usati nelle pagine legali.
 * Modificali qui una volta sola (o tramite le variabili NEXT_PUBLIC_LEGAL_*).
 */
export const LEGAL = {
  siteName: "Quiz Pediatria",
  owner: process.env.NEXT_PUBLIC_LEGAL_OWNER?.trim() || "Cristian Sebastian Micu",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || "contact@sebastianmicu.com",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || null,
  siteUrl: siteUrl(),
  lastUpdated: "7 ottobre 2026",
} as const;

export const PRIVACY_PATH = "/privacy";
export const COOKIE_PATH = "/cookie";
export const TERMS_PATH = "/termini";
