"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BUTTON_ZOOM_STEP = 1.5;
const DOUBLE_TAP_SCALE = 2.5;
const KEY_PAN_STEP = 60;
const TAP_MAX_MOVE = 8;
const TAP_MAX_MS = 300;

type View = { scale: number; x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40";

/**
 * Immagine a tutto schermo con zoom e spostamento: rotellina o pizzico per
 * ingrandire, trascinamento per spostarsi, doppio tocco per alternare lo
 * zoom; da tastiera + / − / 0, frecce ed Esc.
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const tapRef = useRef<{
    x: number;
    y: number;
    at: number;
    backdrop: boolean;
  } | null>(null);
  const lastTapRef = useRef(0);

  /** Quanto l'immagine può essere spostata: mai oltre i bordi visibili. */
  const limits = useCallback((scale: number) => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2),
      y: Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2),
    };
  }, []);

  const constrain = useCallback(
    (next: View): View => {
      const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
      const max = limits(scale);
      return {
        scale,
        x: clamp(next.x, -max.x, max.x),
        y: clamp(next.y, -max.y, max.y),
      };
    },
    [limits]
  );

  /** Zoom mantenendo fermo il punto sotto il cursore (o il centro). */
  const zoomBy = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setView((prev) => {
        const stage = stageRef.current;
        const scale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
        if (!stage) return { ...prev, scale };
        const rect = stage.getBoundingClientRect();
        const px =
          (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
        const py =
          (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
        const ratio = scale / prev.scale;
        return constrain({
          scale,
          x: px - (px - prev.x) * ratio,
          y: py - (py - prev.y) * ratio,
        });
      });
    },
    [constrain]
  );

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);

  // Blocca lo scorrimento della pagina e riporta il focus a fine zoom.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Rotellina / pizzico del trackpad: serve un listener non passivo per
  // impedire lo scorrimento della pagina sotto.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const speed = event.ctrlKey ? 0.01 : 0.0018;
      zoomBy(Math.exp(-event.deltaY * speed), event.clientX, event.clientY);
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Se la finestra cambia dimensione i limiti cambiano: si riallinea.
  useEffect(() => {
    function onResize() {
      setView((prev) => constrain(prev));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [constrain]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // La cattura può non essere disponibile (es. eventi sintetici): il
    // trascinamento funziona lo stesso finché il puntatore resta sopra.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignorato di proposito.
    }
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDragging(true);

    if (pointersRef.current.size === 1) {
      // Con il puntatore catturato il bersaglio finale è sempre lo sfondo:
      // si ricorda dove è iniziato il tocco.
      tapRef.current = {
        x: event.clientX,
        y: event.clientY,
        at: Date.now(),
        backdrop: event.target === event.currentTarget,
      };
    } else {
      tapRef.current = null;
      const [a, b] = [...pointersRef.current.values()];
      pinchDistanceRef.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const last = pinchDistanceRef.current;
      pinchDistanceRef.current = distance;
      if (last && last > 0) {
        zoomBy(distance / last, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setView((prev) => constrain({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
    setDragging(pointersRef.current.size > 0);

    // Tocco breve (senza trascinamento): doppio tocco = zoom, tocco
    // singolo sullo sfondo = chiusura.
    const tap = tapRef.current;
    tapRef.current = null;
    if (
      event.type !== "pointerup" ||
      !tap ||
      Date.now() - tap.at > TAP_MAX_MS ||
      Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_MAX_MOVE
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < TAP_MAX_MS * 1.5) {
      lastTapRef.current = 0;
      if (view.scale > 1.05) reset();
      else zoomBy(DOUBLE_TAP_SCALE, event.clientX, event.clientY);
      return;
    }
    lastTapRef.current = now;
    if (tap.backdrop) onClose();
  }

  function onKeyDown(event: KeyboardEvent) {
    // Nessun tasto deve raggiungere le scorciatoie del quiz sotto: il
    // gestore sta su `document`, quindi la propagazione si ferma qui
    // prima di `window`.
    event.stopPropagation();

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        return;
      case "+":
      case "=":
        event.preventDefault();
        zoomBy(BUTTON_ZOOM_STEP);
        return;
      case "-":
        event.preventDefault();
        zoomBy(1 / BUTTON_ZOOM_STEP);
        return;
      case "0":
        event.preventDefault();
        reset();
        return;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        event.preventDefault();
        const dx =
          event.key === "ArrowLeft"
            ? KEY_PAN_STEP
            : event.key === "ArrowRight"
              ? -KEY_PAN_STEP
              : 0;
        const dy =
          event.key === "ArrowUp"
            ? KEY_PAN_STEP
            : event.key === "ArrowDown"
              ? -KEY_PAN_STEP
              : 0;
        setView((prev) => constrain({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        return;
      }
      case "Tab": {
        // Il focus resta tra i comandi della finestra.
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled)"
        );
        if (!controls || controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
    }
  }

  // I tasti valgono ovunque sia il focus: Esc deve chiudere anche dopo
  // un clic sullo sfondo o sul pulsante.
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const zoomed = view.scale > 1.001;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt ? `Immagine ingrandita: ${alt}` : "Immagine ingrandita"}
      className="fixed inset-0 z-[100] bg-neutral-950/90"
    >
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={cn(
          "absolute inset-0 flex touch-none select-none items-center justify-center overflow-hidden p-4 pt-16 sm:p-8 sm:pt-16",
          zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- immagine del bucket Supabase, dimensioni non note */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transition: dragging ? "none" : "transform 120ms ease-out",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3">
        <p className="pointer-events-auto rounded-md bg-black/40 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
          {Math.round(view.scale * 100)}%
        </p>
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/40 p-1"
          role="toolbar"
          aria-label="Comandi dell'immagine"
        >
          <button
            type="button"
            onClick={() => zoomBy(1 / BUTTON_ZOOM_STEP)}
            disabled={view.scale <= MIN_SCALE}
            aria-label="Riduci"
            title="Riduci (−)"
            className={iconButton}
          >
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(BUTTON_ZOOM_STEP)}
            disabled={view.scale >= MAX_SCALE}
            aria-label="Ingrandisci"
            title="Ingrandisci (+)"
            className={iconButton}
          >
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!zoomed && view.x === 0 && view.y === 0}
            aria-label="Adatta allo schermo"
            title="Adatta allo schermo (0)"
            className={iconButton}
          >
            <Maximize className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="mx-1 h-5 w-px bg-white/25" aria-hidden="true" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            title="Chiudi (Esc)"
            className={iconButton}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-3 px-4 text-center text-xs text-white/60">
        <span className="hidden sm:inline">
          Rotellina per ingrandire · trascina per spostare · doppio clic per
          alternare lo zoom · Esc per chiudere
        </span>
        <span className="sm:hidden">
          Pizzica per ingrandire · trascina per spostare · doppio tocco per lo
          zoom
        </span>
      </p>
    </div>,
    document.body
  );
}
