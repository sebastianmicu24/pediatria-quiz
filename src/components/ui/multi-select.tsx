"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResetOnHide } from "@/lib/use-reset-on-hide";

export type MultiSelectOption = {
  value: string;
  label: string;
};

/**
 * Tendina multi-selezione: si apre con un tocco, mostra le opzioni
 * con checkbox, riepiloga le scelte sul pulsante. Pensata per essere
 * comoda anche da mobile (righe alte, pannello a tutta larghezza).
 */
export function MultiSelect({
  legend,
  options,
  selected,
  onChange,
  allLabel,
  searchable = false,
  searchPlaceholder = "Cerca…",
  emptyLabel = "Nessun risultato",
}: {
  legend: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLFieldSetElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();

  // Al ritorno sulla pagina la tendina non deve restare aperta.
  useResetOnHide(() => {
    setOpen(false);
    setQuery("");
  });

  // Chiudi con click fuori o con Esc.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedSet = new Set(selected);
  const labelFor = (value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length <= 2
        ? selected.map(labelFor).join(", ")
        : `${selected.slice(0, 2).map(labelFor).join(", ")} +${selected.length - 2}`;

  const filtered = query
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  function toggle(value: string) {
    onChange(
      selectedSet.has(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }

  return (
    <fieldset ref={rootRef} className="relative min-w-0">
      <legend className="text-sm font-semibold text-slate-900">{legend}</legend>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? listId : undefined}
        className={cn(
          "mt-3 flex h-11 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border bg-white px-3.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
          open
            ? "border-brand-500 ring-2 ring-brand-500/25"
            : "border-slate-300 hover:border-slate-400"
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            selected.length === 0
              ? "text-slate-500"
              : "font-medium text-slate-900"
          )}
        >
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={listId}
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          {searchable ? (
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
              </div>
            </div>
          ) : null}

          <ul className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-slate-500">
                {emptyLabel}
              </li>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <li key={option.value}>
                    <label
                      className={cn(
                        "flex cursor-pointer touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isSelected
                          ? "bg-brand-50 font-medium text-brand-900"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(option.value)}
                        className="h-4 w-4 shrink-0 accent-brand-600"
                      />
                      <span className="flex-1 leading-snug">{option.label}</span>
                      {isSelected ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-brand-600"
                          aria-hidden="true"
                        />
                      ) : null}
                    </label>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1.5">
            <button
              type="button"
              onClick={() => onChange(options.map((option) => option.value))}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              Seleziona tutto
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              Pulisci
            </button>
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
