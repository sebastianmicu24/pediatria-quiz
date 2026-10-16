"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, sanitizeHtml } from "@/lib/utils";
import { ImageLightbox } from "@/components/image-lightbox";

/**
 * Testo formattato di domande e spiegazioni. Le immagini si aprono a
 * tutto schermo con un clic (o Invio da tastiera), con zoom e
 * spostamento.
 */
export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(
    null
  );
  const markup = useMemo(() => ({ __html: sanitizeHtml(html) }), [html]);

  // Le immagini diventano comandi raggiungibili anche da tastiera.
  useEffect(() => {
    ref.current?.querySelectorAll("img").forEach((image) => {
      const alt = image.getAttribute("alt");
      image.setAttribute("tabindex", "0");
      image.setAttribute("role", "button");
      image.setAttribute(
        "aria-label",
        alt ? `Ingrandisci immagine: ${alt}` : "Ingrandisci immagine"
      );
    });
  }, [markup]);

  function open(image: HTMLImageElement) {
    setZoomed({
      src: image.currentSrc || image.src,
      alt: image.getAttribute("alt") ?? "",
    });
  }

  return (
    <>
      <div
        ref={ref}
        className={cn("rich-text rich-text-zoomable", className)}
        dangerouslySetInnerHTML={markup}
        onClick={(event) => {
          const target = event.target;
          if (target instanceof HTMLImageElement) open(target);
        }}
        onKeyDown={(event) => {
          const target = event.target;
          if (
            target instanceof HTMLImageElement &&
            (event.key === "Enter" || event.key === " ")
          ) {
            // Non deve far proseguire il quiz (Invio) né scorrere la pagina.
            event.preventDefault();
            event.stopPropagation();
            open(target);
          }
        }}
      />
      {zoomed ? (
        <ImageLightbox
          src={zoomed.src}
          alt={zoomed.alt}
          onClose={() => setZoomed(null)}
        />
      ) : null}
    </>
  );
}
