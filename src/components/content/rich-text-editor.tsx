"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editor visual de texto formatado. O conteúdo vai para o formulário em um campo
 * oculto (`name`) como JSON; o servidor saneia antes de salvar.
 */
export function RichTextEditor({
  name,
  defaultValue,
  placeholder = "Escreva aqui...",
  id,
  invalid,
  minHeight = "10rem",
}: {
  name: string;
  defaultValue?: unknown;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  minHeight?: string;
}) {
  const [json, setJson] = React.useState(() => (defaultValue ? JSON.stringify(defaultValue) : ""));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], defaultProtocol: "https" },
      }),
    ],
    content: (defaultValue as object) ?? "",
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: "prose-editor focus:outline-none px-4 py-3",
        style: `min-height:${minHeight}`,
        "aria-multiline": "true",
        role: "textbox",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => setJson(editor.isEmpty ? "" : JSON.stringify(editor.getJSON())),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Endereço do link (https://...)", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  type Btn = { label: string; icon: React.ElementType; active?: boolean; disabled?: boolean; run: () => void };
  const groups: Btn[][] = editor
    ? [
        [
          { label: "Título", icon: Heading2, active: state?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
          { label: "Subtítulo", icon: Heading3, active: state?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        ],
        [
          { label: "Negrito", icon: Bold, active: state?.bold, run: () => editor.chain().focus().toggleBold().run() },
          { label: "Itálico", icon: Italic, active: state?.italic, run: () => editor.chain().focus().toggleItalic().run() },
          { label: "Sublinhado", icon: Underline, active: state?.underline, run: () => editor.chain().focus().toggleUnderline().run() },
          { label: "Tachado", icon: Strikethrough, active: state?.strike, run: () => editor.chain().focus().toggleStrike().run() },
        ],
        [
          { label: "Lista", icon: List, active: state?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
          { label: "Lista numerada", icon: ListOrdered, active: state?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
          { label: "Citação", icon: Quote, active: state?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
          { label: "Linha divisória", icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
        ],
        [
          { label: state?.link ? "Editar link" : "Inserir link", icon: Link2, active: state?.link, run: setLink },
          { label: "Remover link", icon: Unlink, disabled: !state?.link, run: () => editor.chain().focus().unsetLink().run() },
        ],
        [
          { label: "Desfazer", icon: Undo2, disabled: !state?.canUndo, run: () => editor.chain().focus().undo().run() },
          { label: "Refazer", icon: Redo2, disabled: !state?.canRedo, run: () => editor.chain().focus().redo().run() },
        ],
      ]
    : [];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-white focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-spark-500/50",
        invalid && "border-danger",
      )}
    >
      <div role="toolbar" aria-label="Formatação" className="flex flex-wrap items-center gap-1 border-b border-border bg-surface/70 px-2 py-1.5">
        {groups.map((g, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />}
            {g.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.run}
                disabled={b.disabled}
                title={b.label}
                aria-label={b.label}
                aria-pressed={b.active ?? undefined}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white hover:text-ink disabled:opacity-30",
                  b.active && "bg-navy-900 text-white hover:bg-navy-800 hover:text-white",
                )}
              >
                <b.icon className="size-4" />
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
      <EditorContent editor={editor} className="rich-editor text-[0.95rem] leading-relaxed" />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
