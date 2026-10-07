import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountContent } from "./account-content";
import { AccountSkeleton } from "./account-skeleton";

export const metadata: Metadata = {
  title: "Account",
  description: "Gestisci il tuo profilo, i tuoi dati e la sicurezza dell'account.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
