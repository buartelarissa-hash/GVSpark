"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { keepFormValues } from "@/lib/forms";
import { updateLessonMetaAction } from "../actions";

export function LessonMetaForm({
  lesson,
}: {
  lesson: { id: string; title: string; description: string | null; estimatedMinutes: number | null; published: boolean };
}) {
  const [state, action] = useActionState(updateLessonMetaAction, {});
  const e = state.errors ?? {};
  return (
    <form ref={keepFormValues} action={action} className="space-y-4">
      <input type="hidden" name="lessonId" value={lesson.id} />
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
      <Field label="Título da aula" htmlFor="ls-title" error={e.title} required>
        <Input id="ls-title" name="title" defaultValue={lesson.title} maxLength={150} required aria-invalid={!!e.title} />
      </Field>
      <Field label="Resumo (opcional)" htmlFor="ls-desc" error={e.description}>
        <Textarea id="ls-desc" name="description" defaultValue={lesson.description ?? ""} maxLength={500} rows={3} />
      </Field>
      <Field label="Duração estimada (min)" htmlFor="ls-min" error={e.estimatedMinutes}>
        <Input id="ls-min" name="estimatedMinutes" type="number" min={0} defaultValue={lesson.estimatedMinutes ?? ""} />
      </Field>
      <label className="flex items-start gap-2 text-sm font-medium">
        <input type="checkbox" name="published" defaultChecked={lesson.published} className="mt-0.5 size-4 accent-navy-700" />
        <span>
          Publicar aula
          <span className="block text-xs font-normal text-muted">Desmarcado = rascunho, visível só para quem gerencia o curso.</span>
        </span>
      </label>
      {e.published && <p role="alert" className="text-xs font-medium text-danger">{e.published}</p>}
      <SubmitButton pendingText="Salvando...">Salvar aula</SubmitButton>
    </form>
  );
}
