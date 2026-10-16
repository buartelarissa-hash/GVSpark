import Link from "next/link";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { COURSE_LEVEL, formatDuration } from "@/lib/academy-labels";
import { dayFromEndOfDaySaoPaulo, formatDate } from "@/lib/format";
import type { CourseLevel, EnrollmentStatus } from "@prisma/client";

export type CourseCardData = {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  level: CourseLevel;
  durationMinutes: number | null;
  category: { name: string } | null;
  brand: { name: string } | null;
  enrollment: { status: EnrollmentStatus; mandatory: boolean; dueDate: Date | null } | null;
  percent: number;
};

export function CourseCard({ c }: { c: CourseCardData }) {
  const done = c.enrollment?.status === "COMPLETED";
  const started = c.enrollment && c.enrollment.status !== "NOT_STARTED";
  return (
    <Link
      href={`/academy/cursos/${c.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-spark-500 hover:shadow-md"
    >
      <div className="relative aspect-video bg-navy-900">
        {c.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.coverUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy-700">
            <BookOpen className="size-10 text-spark-500" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {c.enrollment?.mandatory && !done && <Badge tone="spark">Obrigatório</Badge>}
          {done && (
            <Badge tone="success">
              <CheckCircle2 className="size-3" aria-hidden="true" /> Concluído
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">{[c.category?.name, c.brand?.name].filter(Boolean).join(" · ") || "Geral"}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-ink group-hover:text-navy-700">{c.title}</h3>
        {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
        <div className="mt-auto pt-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{COURSE_LEVEL[c.level]}</span>
            {formatDuration(c.durationMinutes) && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" /> {formatDuration(c.durationMinutes)}
              </span>
            )}
            {c.enrollment?.dueDate && !done && <span className="font-semibold text-warning">Prazo: {formatDate(dayFromEndOfDaySaoPaulo(c.enrollment.dueDate))}</span>}
          </p>
          {started && !done && (
            <div className="flex items-center gap-2">
              <Progress value={c.percent} label={`Progresso em ${c.title}`} />
              <span className="text-xs font-semibold tabular-nums">{c.percent}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
