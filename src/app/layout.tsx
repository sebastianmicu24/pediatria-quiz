import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";
import { AuthHashHandler } from "@/components/auth-hash-handler";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { siteUrl } from "@/lib/env";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pediatro.me",
    "quiz pediatria",
    "pediatria",
    "quiz medicina",
    "test pediatria",
    "ripasso pediatria",
    "specializzandi pediatria",
  ],
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ae1c33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      data-scroll-behavior="smooth"
      className={`${plex.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-dvh bg-neutral-50 font-sans text-neutral-800 antialiased">
        <a
          href="#contenuto"
          className="sr-only rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Salta al contenuto
        </a>
        {children}
        <CookieNotice />
        <AuthHashHandler />
      </body>
    </html>
  );
}
