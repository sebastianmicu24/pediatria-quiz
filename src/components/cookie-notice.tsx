"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { COOKIE_PATH } from "@/lib/legal";

const STORAGE_KEY = "quiz-pediatria:cookie-notice-v1";
const STORAGE_EVENT = "quiz-pediatria:cookie-notice-change";

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
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      role="region"
      aria-label="Informativa sull'uso dei cookie"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-center">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            Usiamo solo <strong>cookie tecnici</strong> indispensabili
            all&apos;accesso. Nessun tracciamento, nessuna pubblicità. Dettagli
            nella{" "}
            <Link href={COOKIE_PATH} className="font-medium text-brand-700 underline">
              Cookie Policy
            </Link>
            .
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}
