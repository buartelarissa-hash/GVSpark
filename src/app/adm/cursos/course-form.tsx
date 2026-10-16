"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ImageInput } from "@/components/content/image-input";
import { COURSE_LEVEL, COURSE_STATUS } from "@/lib/academy-labels";
import { keepFormValues } from "@/lib/forms";
import { saveCourseAction } from "./actions";

type Opt = { id: string; label: string };

export type CourseDefaults = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  categoryId: string | null;
  brandId: string | null;
  instructorId: string | null;
  targetAudience: string | null;
  durationMinutes: number | null;
  workloadHours: string | null;
  level: string;
  mandatory: boolean;
  restricted: boolean;
  publishAt: string;
  dueDays: number | null;
  status: string;
};

export function CourseForm({
  course,
  categories,
  brands,
  instructors,
  canChooseInstructor,
}: {
  course?: CourseDefaults;
  categories: Opt[];
  brands: Opt[];
  instructors: Opt[];
  canChooseInstructor: boolean;
}) {
  const [state, action] = useActionState(saveCourseAction, {});
  const e = state.errors ?? {};
  return (
    <form ref={keepFormValues} action={action} className="space-y-8">
      {course && <input type="hidden" name="id" value={course.id} />}
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}

      <section className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          <Field label="Título" htmlFor="title" error={e.title} required>
            <Input id="title" name="title" defaultValue={course?.title} maxLength={150} required aria-invalid={!!e.title} placeholder="Ex.: Especialista em Adesivos" />
          </Field>
          <Field label="Descrição" htmlFor="description" error={e.description} hint="Aparece na página do curso e no catálogo.">
            <Textarea id="description" name="description" defaultValue={course?.description ?? ""} maxLength={2000} rows={5} />
          </Field>
          <Field label="Público-alvo" htmlFor="targetAudience" error={e.targetAudience}>
            <Input id="targetAudience" name="targetAudience" defaultValue={course?.targetAudience ?? ""} maxLength={300} placeholder="Ex.: Vendedores internos e externos" />
          </Field>
        </div>
        <Field label="Imagem de capa" htmlFor="cover" error={e.image}>
          <ImageInput id="cover" name="cover" currentUrl={course?.coverUrl} invalid={!!e.image} />
        </Field>
      </section>

      <section className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-sm font-semibold text-navy-900 sm:col-span-2 lg:col-span-3">Classificação</h2>
        <Field label="Categoria" htmlFor="categoryId" error={e.categoryId}>
          <Select id="categoryId" name="categoryId" defaultValue={course?.categoryId ?? ""}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Marca parceira" htmlFor="brandId" error={e.brandId}>
          <Select id="brandId" name="brandId" defaultValue={course?.brandId ?? ""}>
            <option value="">Nenhuma</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Instrutor responsável"
          htmlFor="instructorId"
          error={e.instructorId}
          hint={canChooseInstructor ? undefined : "Você é o responsável pelos cursos que cria."}
        >
          <Select id="instructorId" name="instructorId" defaultValue={course?.instructorId ?? ""} disabled={!canChooseInstructor} aria-invalid={!!e.instructorId}>
            <option value="">Não definido</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nível de dificuldade" htmlFor="level" error={e.level}>
          <Select id="level" name="level" defaultValue={course?.level ?? "BASIC"}>
            {Object.entries(COURSE_LEVEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Duração estimada (minutos)" htmlFor="durationMinutes" error={e.durationMinutes}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={0} defaultValue={course?.durationMinutes ?? ""} aria-invalid={!!e.durationMinutes} />
        </Field>
        <Field label="Carga horária do certificado (horas)" htmlFor="workloadHours" error={e.workloadHours}>
          <Input id="workloadHours" name="workloadHours" inputMode="decimal" defaultValue={course?.workloadHours ?? ""} placeholder="Ex.: 4 ou 1,5" aria-invalid={!!e.workloadHours} />
        </Field>
      </section>

      <section className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-sm font-semibold text-navy-900 sm:col-span-2 lg:col-span-3">Publicação</h2>
        <Field label="Status" htmlFor="status" error={e.status} hint={course ? undefined : "Crie como rascunho; publique depois de montar as aulas."}>
          <Select id="status" name="status" defaultValue={course?.status ?? "DRAFT"} aria-invalid={!!e.status}>
            {Object.entries(COURSE_STATUS).map(([k, v]) => (
              <option key={k} value={k} disabled={!course && k === "PUBLISHED"}>{v.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data de publicação" htmlFor="publishAt" error={e.publishAt} hint="Opcional: o curso só aparece a partir dessa data.">
          <Input id="publishAt" name="publishAt" type="date" defaultValue={course?.publishAt ?? ""} />
        </Field>
        <Field label="Prazo de conclusão (dias)" htmlFor="dueDays" error={e.dueDays} hint="Contado a partir da atribuição.">
          <Input id="dueDays" name="dueDays" type="number" min={0} defaultValue={course?.dueDays ?? ""} aria-invalid={!!e.dueDays} />
        </Field>
        <div className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="mandatory" defaultChecked={course?.mandatory} className="size-4 accent-navy-700" />
            Curso obrigatório (quando atribuído, aparece como obrigatório para o colaborador)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="restricted" defaultChecked={course?.restricted} className="size-4 accent-navy-700" />
            Visível somente para quem foi atribuído (não aparece no catálogo geral)
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <SubmitButton pendingText="Salvando...">{course ? "Salvar alterações" : "Criar curso"}</SubmitButton>
        <Button asChild variant="outline">
          <Link href={course ? `/adm/cursos/${course.id}` : "/adm/cursos"}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
