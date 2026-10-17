"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadQuizImage } from "@/app/(app)/admin/quiz/actions";
import {
  BlogLinkButton,
  ResizableImage,
} from "@/components/admin/editor-extensions";
import {
  ToolbarButton,
  ToolbarDivider,
} from "@/components/admin/editor-parts";
import { BlogLinkPicker } from "@/components/admin/blog-link-picker";

const FONT_SIZE_OPTIONS = [
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
];

const FONT_FAMILY_OPTIONS = [
  "Arial",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Courier New",
];

/** Normalizza un colore CSS in #rrggbb (per <input type="color">). */
function normalizeColorInput(
  value: string | null | undefined,
  fallback: string
): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  if (value && /^#[0-9a-f]{3}$/i.test(value)) {
    const [r, g, b] = value.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

/**
 * Editor rich text (TipTap) allineato all'allowlist del sanitizzatore:
 * grassetto, corsivo, sottolineato, barrato, elenchi, colore/sfondo,
 * dimensione e font del testo, più immagini caricate su Supabase
 * Storage (bucket "quiz-images"). Niente link liberi, heading o SVG:
 * l'unico collegamento ammesso è il pulsante verso un articolo del blog
 * (`allowBlogLinks`), pensato per le spiegazioni.
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  hint,
  allowBlogLinks = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  hint?: string;
  allowBlogLinks?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const uploadHandlerRef = useRef<(file: File) => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        // Il sanitizzatore non ammette link: meglio disattivarli anche
        // nell'editor (evita auto-link su incolla che verrebbero rimossi).
        link: false,
      }),
      // Nota: StarterKit include già sottolineato, grassetto, corsivo,
      // barrato ed elenchi (niente link o heading in questa configurazione).
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
      // Immagini inline: si inseriscono nel paragrafo e seguono
      // l'allineamento scelto (sinistra/centro/destra/giustificato).
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
      // Sempre registrato: i pulsanti già presenti in un testo vengono
      // riconosciuti e conservati anche dove la barra non permette di
      // inserirne di nuovi.
      BlogLinkButton,
    ],
    content: value,
    editorProps: {
      handleClick: (_view, _pos, event) => {
        // Nell'editor il pulsante si seleziona, non si apre.
        if (event.target instanceof Element && event.target.closest("a")) {
          event.preventDefault();
        }
        return false;
      },
      attributes: {
        id,
        class:
          "rich-text min-h-24 px-3.5 py-3 text-sm leading-relaxed text-neutral-900 focus:outline-none",
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

  // Mantiene aggiornato il gestore usato da paste/drop dell'editor
  // (che resta lo stesso tra un render e l'altro).
  useEffect(() => {
    uploadHandlerRef.current = (file) => {
      void handleFile(file);
    };
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance ? instance.isActive("bold") : false,
      italic: instance ? instance.isActive("italic") : false,
      underline: instance ? instance.isActive("underline") : false,
      strike: instance ? instance.isActive("strike") : false,
      bulletList: instance ? instance.isActive("bulletList") : false,
      orderedList: instance ? instance.isActive("orderedList") : false,
      alignLeft: instance ? instance.isActive({ textAlign: "left" }) : false,
      alignCenter: instance ? instance.isActive({ textAlign: "center" }) : false,
      alignRight: instance ? instance.isActive({ textAlign: "right" }) : false,
      alignJustify: instance ? instance.isActive({ textAlign: "justify" }) : false,
      color: (instance?.getAttributes("textStyle").color as string | null) ?? null,
      background:
        (instance?.getAttributes("textStyle").backgroundColor as string | null) ??
        null,
      fontSize:
        (instance?.getAttributes("textStyle").fontSize as string | null) ?? null,
      fontFamily:
        (instance?.getAttributes("textStyle").fontFamily as string | null) ?? null,
    }),
  });

  async function handleFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadQuizImage(formData);
      if (!result.ok) {
        setUploadError(result.message);
        return;
      }
      editor
        ?.chain()
        .focus()
        .setImage({ src: result.url, alt: file.name })
        .run();
    } catch {
      setUploadError("Errore di rete durante il caricamento dell'immagine.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <div className="overflow-hidden rounded-md border border-neutral-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50/80 px-1.5 py-1.5"
          role="toolbar"
          aria-label="Formattazione del testo"
        >
          <ToolbarButton
            label="Grassetto"
            active={state?.bold ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Corsivo"
            active={state?.italic ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Sottolineato"
            active={state?.underline ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Barrato"
            active={state?.strike ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Elenco puntato"
            active={state?.bulletList ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Elenco numerato"
            active={state?.orderedList ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Allinea a sinistra"
            active={state?.alignLeft ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Allinea al centro (testo e immagini)"
            active={state?.alignCenter ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Allinea a destra"
            active={state?.alignRight ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Giustificato (senza margini ai lati)"
            active={state?.alignJustify ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarDivider />

          <label
            title="Colore del testo"
            className={cn(
              "relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70",
              state?.color && "bg-brand-100"
            )}
          >
            <span
              className="text-sm font-bold leading-none"
              style={{ color: state?.color ?? "#0f172a" }}
            >
              A
            </span>
            <span
              className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded"
              style={{ backgroundColor: state?.color ?? "#0f172a" }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={normalizeColorInput(state?.color, "#0f172a")}
              aria-label="Colore del testo"
              onChange={(event) =>
                editor?.chain().focus().setColor(event.target.value).run()
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <label
            title="Colore di evidenziazione"
            className={cn(
              "relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70",
              state?.background && "bg-brand-100"
            )}
          >
            <Highlighter
              className="h-4 w-4"
              style={{ color: state?.background ?? undefined }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={normalizeColorInput(state?.background, "#fef08a")}
              aria-label="Colore di evidenziazione"
              onChange={(event) =>
                editor
                  ?.chain()
                  .focus()
                  .setBackgroundColor(event.target.value)
                  .run()
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <select
            value={state?.fontSize ?? ""}
            disabled={!editor}
            aria-label="Dimensione del carattere"
            title="Dimensione del carattere"
            onChange={(event) => {
              const size = event.target.value;
              if (!size) editor?.chain().focus().unsetFontSize().run();
              else editor?.chain().focus().setFontSize(size).run();
            }}
            className="h-8 rounded-lg border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">Dim.</option>
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size.replace("px", "")}
              </option>
            ))}
          </select>

          <select
            value={state?.fontFamily ?? ""}
            disabled={!editor}
            aria-label="Tipo di carattere"
            title="Tipo di carattere"
            onChange={(event) => {
              const family = event.target.value;
              if (!family) editor?.chain().focus().unsetFontFamily().run();
              else editor?.chain().focus().setFontFamily(family).run();
            }}
            className="h-8 max-w-24 rounded-lg border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">Font</option>
            {FONT_FAMILY_OPTIONS.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>

          <ToolbarDivider />

          <ToolbarButton
            label="Inserisci immagine (PNG, JPG o WebP)"
            active={false}
            disabled={!editor || uploading}
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

          {allowBlogLinks ? (
            <>
              <ToolbarDivider />
              <ToolbarButton
                label="Collega un articolo del blog (pulsante)"
                active={pickerOpen}
                expanded={pickerOpen}
                disabled={!editor}
                onClick={() => setPickerOpen((open) => !open)}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
              </ToolbarButton>
            </>
          ) : null}

          <ToolbarDivider />

          <ToolbarButton
            label="Rimuovi formattazione"
            active={false}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
        </div>

        {allowBlogLinks && pickerOpen ? (
          <BlogLinkPicker
            onClose={() => setPickerOpen(false)}
            onPick={({ slug, label: buttonLabel }) => {
              editor
                ?.chain()
                .focus()
                .insertContent([
                  { type: "blogLinkButton", attrs: { slug, label: buttonLabel } },
                  { type: "text", text: " " },
                ])
                .run();
              setPickerOpen(false);
            }}
          />
        ) : null}

        {uploadError ? (
          <p className="border-b border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
            {uploadError}
          </p>
        ) : null}

        <EditorContent editor={editor} />
      </div>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

