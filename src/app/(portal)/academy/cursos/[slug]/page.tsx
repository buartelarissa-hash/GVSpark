import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Eye, GraduationCap, Target, UserRound } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { getCourseView } from "@/server/services/learning";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { COURSE_LEVEL, formatDuration } from "@/lib/academy-labels";
import { dayFromEndOfDaySaoPaulo, formatDate } from "@/lib/format";

export const metadata = { title: "Curso" };

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const view = await getCourseView(user, slug);
  if (!view) notFound();
  const { course, enrollment, done, total, percent, resumeLessonId } = view;
  const completed = enrollment?.status === "COMPLETED";
  const started = done.size > 0;
  const workload = course.workloadHours ? `${course.workloadHours.toString().replace(".", ",")} h` : null;

  return (
    <div className="space-y-6">
      {(!view.live || view.manage) && (
        <Alert tone="info" title="Modo de pré-visualização">
          {view.live
            ? "Você gerencia este curso: aulas em rascunho aparecem marcadas e não contam progresso."
            : "Este curso ainda não está liberado aos colaboradores. Você está vendo como ele ficará."}
        </Alert>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]">
        <div className="grid lg:grid-cols-[1fr_24rem]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-600">
              <Link href="/academy" className="hover:underline">GV Spark Academy</Link>
              {course.category && ` · ${course.category.name}`}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{course.title}</h1>
            {course.description && <p className="mt-3 whitespace-pre-line text-muted">{course.description}</p>}
            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5"><GraduationCap className="size-4 text-navy-600" aria-hidden="true" /><dt className="sr-only">Nível</dt><dd>{COURSE_LEVEL[course.level]}</dd></div>
              {formatDuration(course.durationMinutes) && (
                <div className="flex items-center gap-1.5"><Clock className="size-4 text-navy-600" aria-hidden="true" /><dt className="sr-only">Duração</dt><dd>{formatDuration(course.durationMinutes)}</dd></div>
              )}
              <div className="flex items-center gap-1.5"><BookOpen className="size-4 text-navy-600" aria-hidden="true" /><dt className="sr-only">Aulas</dt><dd>{total} {total === 1 ? "aula" : "aulas"}</dd></div>
              {workload && <div className="flex items-center gap-1.5"><dt className="text-muted">Carga horária:</dt><dd>{workload}</dd></div>}
              {course.targetAudience && <div className="flex items-center gap-1.5"><Target className="size-4 text-navy-600" aria-hidden="true" /><dt className="sr-only">Público</dt><dd>{course.targetAudience}</dd></div>}
            </dl>
            {course.instructor && (
              <p className="mt-5 flex items-center gap-2 text-sm">
                <Avatar name={course.instructor.name} src={course.instructor.avatarUrl} size="sm" />
                <span><span className="text-muted">Instrutor:</span> <span className="font-medium">{course.instructor.name}</span></span>
              </p>
            )}
            {course.brand && (
              <Link href={`/academy/marcas/${course.brand.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:underline">
                Marca parceira: {course.brand.name} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <div className="flex flex-col justify-between gap-5 bg-navy-900 p-6 text-white sm:p-8">
            {course.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.coverUrl} alt="" className="aspect-video w-full rounded-lg object-cover" />
            )}
            <div>
              {enrollment?.mandatory && !completed && <Badge tone="spark" className="mb-3">Obrigatório</Badge>}
              {enrollment?.dueDate && !completed && (
                <p className="mb-3 text-sm text-navy-100/85">Prazo: <strong className="text-white">{formatDate(dayFromEndOfDaySaoPaulo(enrollment.dueDate))}</strong></p>
              )}
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-navy-100/85">{completed ? "Curso concluído" : `${done.size} de ${total} ${total === 1 ? "aula" : "aulas"}`}</span>
                <span className="text-xl font-bold tabular-nums">{percent}%</span>
              </div>
              <Progress value={percent} label="Progresso no curso" className="bg-white/15" />
              {completed && enrollment?.completedAt && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-spark-500">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Concluído em {formatDate(enrollment.completedAt)}
                </p>
              )}
              {resumeLessonId && (
                <Button asChild size="lg" className="mt-5 w-full">
                  <Link href={`/academy/cursos/${course.slug}/aulas/${resumeLessonId}`}>
                    {view.manage && !view.live ? <><Eye /> Pré-visualizar</> : completed ? "Revisar curso" : started ? "Continuar" : "Começar curso"} <ArrowRight />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border px-6 py-4 text-lg font-bold text-navy-900">Conteúdo do curso</h2>
          {course.modules.length === 0 && <p className="px-6 py-6 text-sm text-muted">As aulas deste curso ainda estão sendo preparadas.</p>}
          <ol className="divide-y divide-border">
            {course.modules.map((m, i) => (
              <li key={m.id} className="px-6 py-5">
                <h3 className="font-semibold text-navy-900">
                  <span className="mr-2 text-navy-600">Módulo {i + 1}</span>
                  {m.title}
                </h3>
                {m.description && <p className="mt-0.5 text-sm text-muted">{m.description}</p>}
                <ul className="mt-3 space-y-1">
                  {m.lessons.map((l) => {
                    const isDone = done.has(l.id);
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/academy/cursos/${course.slug}/aulas/${l.id}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-navy-50"
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Concluída" />
                          ) : (
                            <Circle className="size-5 shrink-0 text-navy-100" aria-label="Não concluída" />
                          )}
                          <span className="flex-1 font-medium">{l.title}</span>
                          {!l.published && <Badge>Rascunho</Badge>}
                          {l.estimatedMinutes ? <span className="text-xs text-muted">{l.estimatedMinutes} min</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                  {m.lessons.length === 0 && <li className="px-3 py-1 text-xs text-muted">Em preparação.</li>}
                </ul>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <UserRound className="size-3.5" aria-hidden="true" /> As avaliações e certificados deste curso chegam com a Fase 4.
      </p>
    </div>
  );
}
