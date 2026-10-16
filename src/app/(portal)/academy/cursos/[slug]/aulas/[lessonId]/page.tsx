import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { openLesson } from "@/server/services/learning";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BlockView } from "@/components/academy/block-view";
import { cn } from "@/lib/utils";
import { CompleteLesson } from "./complete-lesson";

export const metadata = { title: "Aula" };

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const user = await requireUser();
  const { slug, lessonId } = await params;
  const data = await openLesson(user, slug, lessonId);
  if (!data) notFound();
  const { course, lesson, ordered, position, prev, next, done } = data;
  const base = `/academy/cursos/${course.slug}`;
  const current = ordered[position];
  const canComplete = data.live && current.published;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <article className="min-w-0">
        <Link href={base} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
          <ArrowLeft className="size-4" /> {course.title}
        </Link>
        {!canComplete && (
          <Alert tone="info" className="mb-4" title="Pré-visualização">
            {current.published ? "O curso ainda não foi liberado aos colaboradores." : "Esta aula é um rascunho e só aparece para quem gerencia o curso."}
          </Alert>
        )}
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-600">
          Aula {position + 1} de {ordered.length} · {current.moduleTitle}
        </p>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          {lesson.title} {!lesson.published && <Badge>Rascunho</Badge>}
        </h1>
        {lesson.description && <p className="mt-2 text-muted">{lesson.description}</p>}
        {lesson.estimatedMinutes ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-4" aria-hidden="true" /> {lesson.estimatedMinutes} min
          </p>
        ) : null}

        <div className="mt-6 space-y-8">
          {lesson.blocks.map((b) => (
            <section key={b.id}>
              <BlockView block={b} />
            </section>
          ))}
          {lesson.blocks.length === 0 && <p className="text-sm text-muted">Esta aula ainda não tem conteúdo.</p>}
        </div>

        <div className="mt-10 space-y-4">
          {canComplete && (
            <CompleteLesson lessonId={lesson.id} done={done.has(lesson.id)} nextHref={next ? `${base}/aulas/${next.id}` : null} courseHref={base} />
          )}
          <nav aria-label="Navegação entre aulas" className="flex justify-between gap-3 text-sm">
            {prev ? (
              <Link href={`${base}/aulas/${prev.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy-700 hover:underline">
                <ArrowLeft className="size-4" /> {prev.title}
              </Link>
            ) : <span />}
            {next && !canComplete && (
              <Link href={`${base}/aulas/${next.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy-700 hover:underline">
                {next.title} <ArrowRight className="size-4" />
              </Link>
            )}
          </nav>
        </div>
      </article>

      <aside className="h-fit rounded-xl border border-border bg-white shadow-[var(--shadow-card)] lg:sticky lg:top-20">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold text-navy-900">Progresso</p>
          <div className="mt-2 flex items-center gap-2">
            <Progress value={data.percent} label="Progresso no curso" />
            <span className="text-xs font-semibold tabular-nums">{data.percent}%</span>
          </div>
        </div>
        <nav aria-label="Aulas do curso" className="max-h-[60dvh] overflow-y-auto p-2">
          {course.modules.map((m) => (
            <div key={m.id} className="mb-2">
              <p className="px-2 pb-1 pt-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{m.title}</p>
              <ul>
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`${base}/aulas/${l.id}`}
                      aria-current={l.id === lesson.id ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-navy-50",
                        l.id === lesson.id && "bg-navy-900 font-semibold text-white hover:bg-navy-800",
                      )}
                    >
                      {done.has(l.id) ? (
                        <CheckCircle2 className={cn("size-4 shrink-0", l.id === lesson.id ? "text-spark-500" : "text-success")} aria-label="Concluída" />
                      ) : (
                        <Circle className="size-4 shrink-0 opacity-40" aria-hidden="true" />
                      )}
                      <span className="line-clamp-2">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
