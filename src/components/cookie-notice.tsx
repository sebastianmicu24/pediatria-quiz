"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { COOKIE_PATH } from "@/lib/legal";

const STORAGE_KEY = "pediatroma:cookie-notice-v1";
const STORAGE_EVENT = "pediatroma:cookie-notice-change";

/**
 * Avviso informativo sui cookie.
 * Il sito usa esclusivamente cookie tecnici (sessione di autenticazione):
 * per la normativa italiana non è richiesto un consenso preventivo,
 * ma è doveroso informare l'utente. La chiusura viene ricordata in
 * localStorage (a sua volta un dato tecnico, non un cookie di profilazione).
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignora: il banner ricomparirà alla prossima visita.
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="region"
      aria-label="Informativa sull'uso dei cookie"
    >
      <div className="pointer-events-auto flex max-w-md sm:ml-auto flex-col gap-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-lg shadow-neutral-900/10 sm:flex-row sm:items-center">
        <p className="text-[13px] leading-relaxed text-neutral-600">
          Usiamo solo <strong className="font-semibold text-neutral-900">cookie tecnici</strong>{" "}
          per l&apos;accesso: nessun tracciamento, nessuna pubblicità.{" "}
          <Link
            href={COOKIE_PATH}
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            Dettagli
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}
