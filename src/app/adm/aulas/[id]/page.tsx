import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { getLessonForEdit } from "@/server/services/courses";
import { ServiceError } from "@/server/services/errors";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlockView } from "@/components/academy/block-view";
import { LessonMetaForm } from "./lesson-meta-form";
import { BlocksList } from "./blocks-list";

export const metadata = { title: "Editor de aulas" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const { id } = await params;
  const lesson = await getLessonForEdit(actor, id).catch((e) => {
    if (e instanceof ServiceError) return null;
    throw e;
  });
  if (!lesson) notFound();
  const course = lesson.module.course;

  return (
    <>
      <Link href={`/adm/cursos/${course.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> {course.title}
      </Link>
      <PageHeader
        eyebrow={`Editor de aulas · ${lesson.module.title}`}
        title={lesson.title}
        description={lesson.published ? <Badge tone="success">Publicada</Badge> : <Badge>Rascunho</Badge>}
        actions={
          <Button asChild variant="outline">
            <Link href={`/academy/cursos/${course.slug}/aulas/${lesson.id}`} target="_blank">
              <Eye /> Pré-visualizar
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section aria-label="Blocos de conteúdo">
          <BlocksList
            lessonId={lesson.id}
            courseId={course.id}
            blocks={lesson.blocks.map((b) => ({
              id: b.id,
              type: b.type,
              content: (b.content ?? {}) as Record<string, unknown>,
              file: b.file ? { id: b.file.id, name: b.file.originalName, size: b.file.sizeBytes, mime: b.file.mimeType } : null,
            }))}
            previews={Object.fromEntries(lesson.blocks.map((b) => [b.id, <BlockView key={b.id} block={b} />]))}
          />
        </section>
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle>Dados da aula</CardTitle>
          </CardHeader>
          <CardContent>
            <LessonMetaForm lesson={lesson} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
