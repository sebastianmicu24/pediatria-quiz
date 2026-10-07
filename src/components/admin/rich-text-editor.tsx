"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Editor rich text (TipTap) allineato all'allowlist del sanitizzatore:
 * solo grassetto, corsivo ed elenchi — niente link, immagini o heading.
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  hint?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        class:
          "rich-text min-h-24 px-3.5 py-3 text-sm leading-relaxed text-slate-900 focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? "" : instance.getHTML());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance ? instance.isActive("bold") : false,
      italic: instance ? instance.isActive("italic") : false,
      bulletList: instance ? instance.isActive("bulletList") : false,
      orderedList: instance ? instance.isActive("orderedList") : false,
    }),
  });

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30">
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-1.5 py-1.5"
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
          <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
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
        </div>
        <EditorContent editor={editor} />
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-200/70 disabled:opacity-40",
        active && "bg-brand-100 text-brand-800"
      )}
    >
      {children}
    </button>
  );
}
