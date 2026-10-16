"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LessonBlockType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { FileUpload } from "@/components/content/file-upload";
import { BLOCK_LABEL, fileKindsFor } from "@/lib/lesson-blocks";
import { saveBlockAction } from "../actions";

export type EditableBlock = {
  id: string;
  type: LessonBlockType;
  content: Record<string, unknown>;
  file: { id: string; name: string; size: number; mime: string } | null;
};

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Monta o conteúdo do bloco a partir do formulário. */
function contentFrom(type: LessonBlockType, fd: FormData): Record<string, unknown> {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const doc = (k: string) => {
    const raw = get(k);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  switch (type) {
    case "RICH_TEXT":
      return { doc: doc("doc") };
    case "IMAGE":
      return { fileId: get("fileId"), caption: get("caption"), alt: get("alt") };
    case "VIDEO_EMBED":
      return { url: get("url"), title: get("title") };
    case "LINK":
      return { url: get("url"), title: get("title"), description: get("description") };
    case "ACTIVITY":
      return { title: get("title"), instructions: doc("instructions") };
    case "ATTACHMENT":
      return { fileId: get("fileId"), title: get("title"), description: get("description") };
    default:
      return { fileId: get("fileId"), title: get("title") };
  }
}

export function BlockEditorDialog({
  lessonId,
  courseId,
  type,
  block,
  open,
  onOpenChange,
}: {
  lessonId: string;
  courseId: string;
  type: LessonBlockType;
  block?: EditableBlock;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<{ message: string; field?: string } | null>(null);
  const c = block?.content ?? {};
  const kinds = fileKindsFor(type);
  const fe = (f: string) => (error?.field === f ? error.message : undefined);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await saveBlockAction(lessonId, block?.id ?? null, type, contentFrom(type, new FormData(e.currentTarget)));
    setPending(false);
    if (res.ok) {
      onOpenChange(false);
      router.refresh();
    } else setError({ message: res.error, field: res.field });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${block ? "Editar" : "Adicionar"} bloco · ${BLOCK_LABEL[type]}`} className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          {error && !error.field && <Alert tone="danger">{error.message}</Alert>}

          {type === "RICH_TEXT" && (
            <Field label="Texto" htmlFor="bl-doc" error={fe("doc")} required>
              <RichTextEditor id="bl-doc" name="doc" defaultValue={c.doc} minHeight="14rem" invalid={!!fe("doc")} />
            </Field>
          )}

          {kinds && (
            <Field label="Arquivo" htmlFor="bl-file" error={fe("fileId") ?? fe("file")} required>
              <FileUpload id="bl-file" name="fileId" kinds={kinds} target={{ type: "course", courseId }} initial={block?.file} invalid={!!(fe("fileId") ?? fe("file"))} />
            </Field>
          )}

          {(type === "VIDEO_EMBED" || type === "LINK") && (
            <Field
              label={type === "LINK" ? "Endereço (URL)" : "Link do vídeo (YouTube ou Vimeo)"}
              htmlFor="bl-url"
              error={fe("url")}
              required
            >
              <Input id="bl-url" name="url" type="url" defaultValue={s(c.url)} placeholder="https://" aria-invalid={!!fe("url")} />
            </Field>
          )}

          {type !== "RICH_TEXT" && type !== "IMAGE" && (
            <Field label={type === "LINK" || type === "ACTIVITY" ? "Título" : "Título (opcional)"} htmlFor="bl-title" error={fe("title")} required={type === "LINK" || type === "ACTIVITY"}>
              <Input id="bl-title" name="title" defaultValue={s(c.title)} maxLength={150} aria-invalid={!!fe("title")} />
            </Field>
          )}

          {type === "IMAGE" && (
            <>
              <Field label="Legenda (opcional)" htmlFor="bl-caption" error={fe("caption")}>
                <Input id="bl-caption" name="caption" defaultValue={s(c.caption)} maxLength={300} />
              </Field>
              <Field label="Descrição para acessibilidade" htmlFor="bl-alt" hint="Descreva a imagem para quem usa leitor de tela." error={fe("alt")}>
                <Input id="bl-alt" name="alt" defaultValue={s(c.alt)} maxLength={300} />
              </Field>
            </>
          )}

          {(type === "LINK" || type === "ATTACHMENT") && (
            <Field label="Descrição (opcional)" htmlFor="bl-desc" error={fe("description")}>
              <Textarea id="bl-desc" name="description" defaultValue={s(c.description)} maxLength={500} rows={2} />
            </Field>
          )}

          {type === "ACTIVITY" && (
            <Field label="Instruções" htmlFor="bl-instr" error={fe("instructions")} required>
              <RichTextEditor id="bl-instr" name="instructions" defaultValue={c.instructions} minHeight="10rem" invalid={!!fe("instructions")} />
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {block ? "Salvar bloco" : "Adicionar bloco"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
