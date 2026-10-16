"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Check, PartyPopper } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { keepFormValues } from "@/lib/forms";
import { completeLessonAction } from "./actions";

export function CompleteLesson({
  lessonId,
  done,
  nextHref,
  courseHref,
}: {
  lessonId: string;
  done: boolean;
  nextHref: string | null;
  courseHref: string;
}) {
  const [state, action] = useActionState(completeLessonAction, {});
  const courseDone = state.ok && state.message === "course-completed";
  if (courseDone) {
    return (
      <div className="rounded-xl border-2 border-spark-500 bg-spark-50 p-5 text-center">
        <PartyPopper className="mx-auto size-8 text-navy-900" aria-hidden="true" />
        <p className="mt-2 text-lg font-bold text-navy-900">Parabéns! Você concluiu o curso.</p>
        <Button asChild variant="navy" className="mt-3">
          <Link href={courseHref}>Voltar ao curso</Link>
        </Button>
      </div>
    );
  }
  const isDone = done || state.ok;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      {isDone ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <Check className="size-5" aria-hidden="true" /> Aula concluída
        </p>
      ) : (
        <form ref={keepFormValues} action={action}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <SubmitButton pendingText="Salvando...">
            <Check /> Marcar aula como concluída
          </SubmitButton>
          {state.message && !state.ok && <p role="alert" className="mt-2 text-xs text-danger">{state.message}</p>}
        </form>
      )}
      {nextHref ? (
        <Button asChild variant={isDone ? "primary" : "outline"}>
          <Link href={nextHref}>
            Próxima aula <ArrowRight />
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link href={courseHref}>Voltar ao curso</Link>
        </Button>
      )}
    </div>
  );
}
