"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { CompanySectionType } from "@prisma/client";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { ImageInput } from "@/components/content/image-input";
import { SECTION_LABEL } from "@/lib/company-sections";
import { saveSectionAction } from "../actions";
import { keepFormValues } from "@/lib/forms";

export function SectionForm({
  section,
  type,
}: {
  section?: { id: string; title: string; body: unknown; mediaUrl: string | null; published: boolean };
  type: CompanySectionType;
}) {
  const [state, action] = useActionState(saveSectionAction, {});
  const e = state.errors ?? {};
  const isVideo = type === "VIDEO";
  return (
    <form ref={keepFormValues} action={action} className="space-y-6">
      {section && <input type="hidden" name="id" value={section.id} />}
      <input type="hidden" name="type" value={type} />
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}

      <Field label="Título" htmlFor="title" error={e.title} required>
        <Input id="title" name="title" defaultValue={section?.title ?? SECTION_LABEL[type]} maxLength={120} required aria-invalid={!!e.title} />
      </Field>

      {isVideo ? (
        <Field
          label="Link do vídeo"
          htmlFor="videoUrl"
          error={e.videoUrl}
          required
          hint="Cole o link do YouTube ou Vimeo. Para vídeos privados do YouTube, use a opção “Não listado”."
        >
          <Input id="videoUrl" name="videoUrl" type="url" defaultValue={section?.mediaUrl ?? ""} placeholder="https://www.youtube.com/watch?v=..." aria-invalid={!!e.videoUrl} />
        </Field>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <Field label="Conteúdo" htmlFor="body" error={e.body} required>
            <RichTextEditor id="body" name="body" defaultValue={section?.body ?? undefined} invalid={!!e.body} minHeight="16rem" />
          </Field>
          <Field label={type === "FOUNDERS" ? "Foto" : "Imagem (opcional)"} htmlFor="image" error={e.image}>
            <ImageInput id="image" name="image" currentUrl={section?.mediaUrl} aspect={type === "FOUNDERS" ? "aspect-square" : "aspect-video"} invalid={!!e.image} />
          </Field>
        </div>
      )}

      {isVideo && (
        <Field label="Descrição (opcional)" htmlFor="body">
          <RichTextEditor id="body" name="body" defaultValue={section?.body ?? undefined} minHeight="6rem" />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="published" defaultChecked={section?.published ?? false} className="size-4 accent-navy-700" />
        Publicar — exibir para os colaboradores
      </label>

      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
        <Button asChild variant="outline">
          <Link href="/adm/historia">Voltar</Link>
        </Button>
      </div>
    </form>
  );
}
