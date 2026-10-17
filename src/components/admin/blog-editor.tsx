"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BackgroundColor,
  Color,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { countWords, readingMinutes } from "@/lib/blog";
import { uploadBlogImage } from "@/app/(app)/admin/blog/actions";
import { ResizableImage } from "@/components/admin/editor-extensions";
import {
  ToolbarButton,
  ToolbarDivider,
} from "@/components/admin/editor-parts";

/**
 * Colori proposti dall'editor: la palette del sito (rosso istituzionale,
 * neutri) più pochi toni semantici. Il testo parte dal colore e dal
 * carattere predefiniti del blog: le scelte qui sono eccezioni, non la
 * norma, e per questo non c'è la scelta del font.
 */
const TEXT_COLORS = [
  { name: "Rosso del sito", value: "#ae1c33" },
  { name: "Bordeaux", value: "#7a192c" },
  { name: "Grigio", value: "#737373" },
  { name: "Blu", value: "#0369a1" },
  { name: "Verde", value: "#047857" },
  { name: "Ambra", value: "#b45309" },
];

const HIGHLIGHT_COLORS = [
  { name: "Rosa del sito", value: "#fbe4e8" },
  { name: "Giallo", value: "#fef08a" },
  { name: "Verde", value: "#d1fae5" },
  { name: "Azzurro", value: "#e0f2fe" },
  { name: "Ambra", value: "#fde68a" },
  { name: "Grigio", value: "#f5f5f5" },
];

/** Dimensioni relative al testo del blog (il sanitizzatore ammette "em"). */
const FONT_SIZES = [
  { label: "Piccolo", value: "0.875em" },
  { label: "Grande", value: "1.25em" },
  { label: "Molto grande", value: "1.5em" },
];

const BLOCK_STYLES = [
  { value: "p", label: "Paragrafo" },
  { value: "2", label: "Titolo" },
  { value: "3", label: "Sottotitolo" },
  { value: "4", label: "Titoletto" },
] as const;

type HeadingLevel = 2 | 3 | 4;

/**
 * Trasforma ciò che l'admin scrive in una destinazione ammessa:
 * http(s), mailto, tel, percorso interno o ancora. Qualsiasi altro schema
 * (javascript:, data:…) viene rifiutato; il sanitizzatore lo rifarebbe
 * comunque al salvataggio e al render.
 */
function normalizeLinkInput(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  if (/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(value)) return `mailto:${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

/** Normalizza un colore CSS in #rrggbb (per <input type="color">). */
function normalizeColorInput(
  value: string | null | undefined,
  fallback: string
): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return fallback;
}

/**
 * Editor degli articoli del blog (TipTap). Rispetto a quello dei quiz
 * aggiunge titoli, citazioni, linea di separazione, apici e pedici,
 * tabelle e link. Il contenuto dell'editor usa le stesse regole di stile
 * della pagina pubblica (`.blog-prose`): ciò che si vede qui è ciò che
 * leggeranno gli utenti.
 *
 * Il codice HTML prodotto passa dal sanitizzatore (profilo "blog") sia al
 * salvataggio, sul server, sia alla visualizzazione.
 */
export function BlogEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const uploadHandlerRef = useRef<(file: File) => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        code: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          protocols: ["mailto", "tel"],
        },
      }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      TableKit.configure({ table: { resizable: false } }),
      ResizableImage.configure({
        allowBase64: false,
        inline: true,
        resize: {
          enabled: true,
          directions: ["bottom-right"],
          minWidth: 48,
          minHeight: 48,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Placeholder.configure({ placeholder: "Scrivi qui l'articolo…" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        class:
          "blog-prose min-h-96 px-5 py-4 focus:outline-none sm:px-7 sm:py-6",
      },
      handlePaste: (_view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          uploadHandlerRef.current(file);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const file = (event as DragEvent).dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          uploadHandlerRef.current(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? "" : instance.getHTML());
    },
  });

  useEffect(() => {
    uploadHandlerRef.current = (file) => {
      void handleFile(file);
    };
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return null;
      const textStyle = instance.getAttributes("textStyle");
      const level = [2, 3, 4].find((item) =>
        instance.isActive("heading", { level: item })
      );
      return {
        blockStyle: level ? String(level) : "p",
        bold: instance.isActive("bold"),
        italic: instance.isActive("italic"),
        underline: instance.isActive("underline"),
        strike: instance.isActive("strike"),
        subscript: instance.isActive("subscript"),
        superscript: instance.isActive("superscript"),
        bulletList: instance.isActive("bulletList"),
        orderedList: instance.isActive("orderedList"),
        blockquote: instance.isActive("blockquote"),
        link: instance.isActive("link"),
        linkHref: (instance.getAttributes("link").href as string | undefined) ?? "",
        inTable: instance.isActive("table"),
        alignLeft: instance.isActive({ textAlign: "left" }),
        alignCenter: instance.isActive({ textAlign: "center" }),
        alignRight: instance.isActive({ textAlign: "right" }),
        alignJustify: instance.isActive({ textAlign: "justify" }),
        color: (textStyle.color as string | null) ?? null,
        background: (textStyle.backgroundColor as string | null) ?? null,
        fontSize: (textStyle.fontSize as string | null) ?? "",
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
      };
    },
  });

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadBlogImage(formData);
      if (!result.ok) {
        setUploadError(result.message);
        return;
      }
      editor
        ?.chain()
        .focus()
        .setImage({ src: result.url, alt: file.name.replace(/\.[^.]+$/, "") })
        .run();
    } catch {
      setUploadError("Errore di rete durante il caricamento dell'immagine.");
    } finally {
      setUploading(false);
    }
  }

  function toggleLinkPanel() {
    if (linkOpen) {
      setLinkOpen(false);
      return;
    }
    setLinkValue(state?.linkHref ?? "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = normalizeLinkInput(linkValue);
    if (!href) {
      setLinkError(
        "Indirizzo non valido: usa un link http(s), un indirizzo email o un percorso del sito (es. /blog/altro-articolo)."
      );
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nessun testo selezionato: il link mostra il suo stesso indirizzo.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href.replace(/^mailto:|^tel:/i, ""),
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  const disabled = !editor;
  const words = countWords(value);

  return (
    <div>
      <div className="rounded-lg border border-neutral-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
        <div
          className="sticky top-14 z-20 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-neutral-200 bg-neutral-50/95 px-1.5 py-1.5 backdrop-blur lg:top-0"
          role="toolbar"
          aria-label="Formattazione dell'articolo"
        >
          <ToolbarButton
            label="Annulla"
            active={false}
            disabled={disabled || !state?.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Ripeti"
            active={false}
            disabled={disabled || !state?.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <select
            value={state?.blockStyle ?? "p"}
            disabled={disabled}
            aria-label="Stile del paragrafo"
            title="Stile del paragrafo"
            onChange={(event) => {
              const chain = editor?.chain().focus();
              if (event.target.value === "p") chain?.setParagraph().run();
              else {
                chain
                  ?.setHeading({ level: Number(event.target.value) as HeadingLevel })
                  .run();
              }
            }}
            className="h-8 rounded-lg border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            {BLOCK_STYLES.map((style) => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>

          <ToolbarDivider />

          <ToolbarButton
            label="Grassetto"
            active={state?.bold ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Corsivo"
            active={state?.italic ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Sottolineato"
            active={state?.underline ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Barrato"
            active={state?.strike ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Pedice (es. H₂O)"
            active={state?.subscript ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleSubscript().run()}
          >
            <SubscriptIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Apice (es. m²)"
            active={state?.superscript ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          >
            <SuperscriptIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ColorMenu
            label="Colore del testo"
            disabled={disabled}
            current={state?.color ?? null}
            colors={TEXT_COLORS}
            customFallback="#ae1c33"
            resetLabel="Colore predefinito"
            onSelect={(color) => editor?.chain().focus().setColor(color).run()}
            onReset={() => editor?.chain().focus().unsetColor().run()}
            icon={
              <>
                <span
                  className="text-sm font-bold leading-none"
                  style={{ color: state?.color ?? "#171717" }}
                >
                  A
                </span>
                <span
                  className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded"
                  style={{ backgroundColor: state?.color ?? "#171717" }}
                  aria-hidden="true"
                />
              </>
            }
          />
          <ColorMenu
            label="Evidenziazione"
            disabled={disabled}
            current={state?.background ?? null}
            colors={HIGHLIGHT_COLORS}
            customFallback="#fef08a"
            resetLabel="Nessuna evidenziazione"
            onSelect={(color) =>
              editor?.chain().focus().setBackgroundColor(color).run()
            }
            onReset={() => editor?.chain().focus().unsetBackgroundColor().run()}
            icon={
              <Highlighter
                className="h-4 w-4"
                style={{ color: state?.background ?? undefined }}
                aria-hidden="true"
              />
            }
          />

          <select
            value={state?.fontSize ?? ""}
            disabled={disabled}
            aria-label="Dimensione del testo"
            title="Dimensione del testo"
            onChange={(event) => {
              const size = event.target.value;
              if (!size) editor?.chain().focus().unsetFontSize().run();
              else editor?.chain().focus().setFontSize(size).run();
            }}
            className="h-8 rounded-lg border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">Normale</option>
            {FONT_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>

          <ToolbarDivider />

          <ToolbarButton
            label="Elenco puntato"
            active={state?.bulletList ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Elenco numerato"
            active={state?.orderedList ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Citazione"
            active={state?.blockquote ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Linea di separazione"
            active={false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Allinea a sinistra"
            active={state?.alignLeft ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Allinea al centro (testo e immagini)"
            active={state?.alignCenter ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Allinea a destra"
            active={state?.alignRight ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Giustificato"
            active={state?.alignJustify ?? false}
            disabled={disabled}
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Inserisci o modifica un link"
            active={(state?.link ?? false) || linkOpen}
            expanded={linkOpen}
            disabled={disabled}
            onClick={toggleLinkPanel}
          >
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Rimuovi il link"
            active={false}
            disabled={disabled || !state?.link}
            onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}
          >
            <Unlink className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Inserisci immagine (PNG, JPG o WebP)"
            active={false}
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <ToolbarButton
            label="Inserisci una tabella 3×3"
            active={state?.inTable ?? false}
            disabled={disabled}
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            <TableIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Rimuovi formattazione"
            active={false}
            disabled={disabled}
            onClick={() =>
              editor?.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
        </div>

        {state?.inTable ? (
          <div
            className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-brand-50/50 px-2.5 py-1.5 text-xs"
            role="toolbar"
            aria-label="Modifica della tabella"
          >
            <span className="mr-1 font-medium text-neutral-700">Tabella:</span>
            <TableAction onClick={() => editor?.chain().focus().addRowAfter().run()}>
              + Riga
            </TableAction>
            <TableAction onClick={() => editor?.chain().focus().addColumnAfter().run()}>
              + Colonna
            </TableAction>
            <TableAction onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>
              Riga di intestazione
            </TableAction>
            <TableAction onClick={() => editor?.chain().focus().deleteRow().run()}>
              − Riga
            </TableAction>
            <TableAction onClick={() => editor?.chain().focus().deleteColumn().run()}>
              − Colonna
            </TableAction>
            <TableAction
              danger
              onClick={() => editor?.chain().focus().deleteTable().run()}
            >
              Elimina tabella
            </TableAction>
          </div>
        ) : null}

        {linkOpen ? (
          <div className="space-y-1.5 border-b border-neutral-200 bg-brand-50/40 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`${id}-link`} className="text-xs font-medium text-neutral-700">
                Indirizzo del link
              </label>
              <input
                id={`${id}-link`}
                value={linkValue}
                onChange={(event) => {
                  setLinkValue(event.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(event) => {
                  // Dentro il modulo dell'articolo: Invio non deve salvarlo.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setLinkOpen(false);
                    editor?.commands.focus();
                  }
                }}
                placeholder="https://… oppure /blog/altro-articolo"
                maxLength={2000}
                autoFocus
                className="h-8 min-w-48 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
              <button
                type="button"
                onClick={applyLink}
                className="h-8 rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Applica
              </button>
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                className="h-8 rounded-md px-2 text-sm text-neutral-600 hover:bg-neutral-200/70"
              >
                Annulla
              </button>
            </div>
            {linkError ? (
              <p role="alert" className="text-xs font-medium text-rose-700">
                {linkError}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500">
                Seleziona prima il testo da collegare. I link esterni si aprono
                in una nuova scheda.
              </p>
            )}
          </div>
        ) : null}

        {uploadError ? (
          <p className="border-b border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
            {uploadError}
          </p>
        ) : null}

        <EditorContent editor={editor} />

        <p className="rounded-b-lg border-t border-neutral-100 bg-neutral-50/60 px-4 py-1.5 text-xs tabular-nums text-neutral-500">
          {words} {words === 1 ? "parola" : "parole"} · lettura di circa{" "}
          {readingMinutes(value)} min
        </p>
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">
        Incolla o trascina un&apos;immagine per caricarla (PNG, JPG o WebP, fino a
        5 MB) e ridimensionala dalla maniglia nell&apos;angolo. Stile, colori e
        caratteri seguono quelli del sito.
      </p>
    </div>
  );
}

function TableAction({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded-md border bg-white px-2 py-1 font-medium transition-colors",
        danger
          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
          : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Selettore di colore con la palette del sito, "predefinito" e, se serve,
 * una tinta libera.
 */
function ColorMenu({
  label,
  disabled,
  current,
  colors,
  customFallback,
  resetLabel,
  onSelect,
  onReset,
  icon,
}: {
  label: string;
  disabled: boolean;
  current: string | null;
  colors: { name: string; value: string }[];
  customFallback: string;
  resetLabel: string;
  onSelect: (color: string) => void;
  onReset: () => void;
  icon: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70 disabled:opacity-40",
          (current || open) && "bg-brand-100"
        )}
      >
        {icon}
      </button>
      {open ? (
        <div
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-neutral-200 bg-white p-2.5 shadow-lg"
        >
          <div className="grid grid-cols-6 gap-1.5">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.name}
                aria-label={color.name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(color.value);
                  setOpen(false);
                }}
                className={cn(
                  "h-6 w-6 rounded-md border border-black/10 transition-transform hover:scale-110",
                  current?.toLowerCase() === color.value && "ring-2 ring-brand-600 ring-offset-1"
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="text-xs font-medium text-neutral-700 hover:text-brand-700"
            >
              {resetLabel}
            </button>
            <label className="relative cursor-pointer text-xs font-medium text-neutral-700 hover:text-brand-700">
              Altro…
              <input
                type="color"
                value={normalizeColorInput(current, customFallback)}
                aria-label={`${label}: altro colore`}
                onChange={(event) => onSelect(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
