import {
  BarChart3,
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Mappa di navigazione dell'area riservata.
 *
 * Per aggiungere una sezione:
 *  1. aggiungi una voce qui (`status: "soon"` mostra la voce come "in arrivo");
 *  2. crea la cartella in `src/app/(app)/<sezione>`;
 *  3. aggiungi il prefisso a PROTECTED_PREFIXES in `src/lib/supabase/proxy.ts`;
 *  4. quando è pronta, passa `status` a "live".
 */
export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  status: "live" | "soon";
};

export const APP_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Il punto di partenza: esercitazione, ripasso e riepilogo.",
    icon: LayoutDashboard,
    status: "live",
  },
  {
    href: "/quiz",
    label: "Quiz",
    description: "Esercitazioni per argomento, difficoltà e stato di ripasso.",
    icon: ListChecks,
    status: "live",
  },
  {
    href: "/statistiche",
    label: "Statistiche",
    description: "Andamento, copertura e precisione per argomento.",
    icon: BarChart3,
    status: "live",
  },
  {
    href: "/blog",
    label: "Blog",
    description: "Approfondimenti di pediatria, collegati dalle spiegazioni dei quiz.",
    icon: Newspaper,
    status: "live",
  },
  {
    href: "/turni",
    label: "Turni",
    description:
      "Disponibilità e assegnazione mensile di turni, guardie e rotazioni.",
    icon: CalendarClock,
    status: "soon",
  },
  {
    href: "/strumenti",
    label: "Strumenti",
    description: "Applicazioni cliniche e di ricerca: segmentatore cellulare, genogrammi e altro.",
    icon: Wrench,
    status: "soon",
  },
];

export const ADMIN_NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Panoramica", exact: true },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/utenti", label: "Utenti" },
];

export const ACCOUNT_HREF = "/account";

export function isActivePath(pathname: string, href: string, exact = false) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
