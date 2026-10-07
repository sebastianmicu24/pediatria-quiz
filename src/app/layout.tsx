import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { NavbarSkeleton } from "@/components/navbar-skeleton";
import { Footer } from "@/components/footer";
import { CookieNotice } from "@/components/cookie-notice";
import { AuthHashHandler } from "@/components/auth-hash-handler";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { siteUrl } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    "pediatroma",
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
    <html lang="it" className={inter.variable}>
      <body className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-800 antialiased">
        <a
          href="#contenuto"
          className="sr-only rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-lg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Salta al contenuto
        </a>
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar />
        </Suspense>
        <main id="contenuto" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieNotice />
        <AuthHashHandler />
      </body>
    </html>
  );
}
