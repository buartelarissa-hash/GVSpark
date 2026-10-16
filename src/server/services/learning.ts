import "server-only";
import type { CourseLevel, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./errors";
import { canManageCourse, canViewCourse, isCourseLive } from "./academy-access";
import type { CurrentUser } from "@/server/auth/current-user";

/** Cursos publicados que o colaborador enxerga no catálogo. */
function catalogWhere(user: CurrentUser): Prisma.CourseWhereInput {
  const now = new Date();
  return {
    status: "PUBLISHED",
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    AND: [{ OR: [{ restricted: false }, { enrollments: { some: { userId: user.id } } }] }],
  };
}

/** Percentual de aulas publicadas concluídas. */
function percent(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

async function progressByCourse(userId: string, courseIds: string[]) {
  if (!courseIds.length) return new Map<string, { done: number; total: number }>();
  const [totals, done] = await Promise.all([
    db.lesson.groupBy({ by: ["moduleId"], where: { published: true, module: { courseId: { in: courseIds } } }, _count: true }),
    db.lessonProgress.findMany({
      where: { userId, lesson: { published: true, module: { courseId: { in: courseIds } } } },
      select: { lesson: { select: { module: { select: { courseId: true } } } } },
    }),
  ]);
  const modules = await db.courseModule.findMany({ where: { courseId: { in: courseIds } }, select: { id: true, courseId: true } });
  const courseOf = new Map(modules.map((m) => [m.id, m.courseId]));
  const map = new Map<string, { done: number; total: number }>();
  for (const id of courseIds) map.set(id, { done: 0, total: 0 });
  for (const t of totals) map.get(courseOf.get(t.moduleId)!)!.total += t._count;
  for (const d of done) map.get(d.lesson.module.courseId)!.done += 1;
  return map;
}

export type CatalogFilters = { q?: string; categoryId?: string; brandId?: string; level?: CourseLevel };

export async function catalogForUser(user: CurrentUser, f: CatalogFilters) {
  const courses = await db.course.findMany({
    where: {
      AND: [
        catalogWhere(user),
        f.q ? { OR: [{ title: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {},
        f.categoryId ? { categoryId: f.categoryId } : {},
        f.brandId ? { brandId: f.brandId } : {},
        f.level ? { level: f.level } : {},
      ],
    },
    orderBy: [{ mandatory: "desc" }, { publishAt: "desc" }],
    include: {
      category: { select: { id: true, name: true, icon: true } },
      brand: { select: { name: true, logoUrl: true } },
      enrollments: { where: { userId: user.id }, select: { status: true, mandatory: true, dueDate: true } },
    },
  });
  const progress = await progressByCourse(user.id, courses.map((c) => c.id));
  return courses.map((c) => {
    const p = progress.get(c.id)!;
    const e = c.enrollments[0];
    return { ...c, enrollment: e ?? null, percent: percent(p.done, p.total), lessons: p.total };
  });
}

export async function myEnrollments(user: CurrentUser) {
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id, course: { status: "PUBLISHED" } },
    orderBy: [{ status: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
    include: { course: { select: { id: true, title: true, slug: true, coverUrl: true, mandatory: true, category: { select: { name: true } } } } },
  });
  const progress = await progressByCourse(user.id, enrollments.map((e) => e.courseId));
  return enrollments.map((e) => {
    const p = progress.get(e.courseId)!;
    return { ...e, percent: percent(p.done, p.total) };
  });
}

/** Página do curso para o colaborador (ou pré-visualização para quem gerencia). */
export async function getCourseView(user: CurrentUser, slug: string) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true, slug: true, logoUrl: true } },
      instructor: { select: { name: true, avatarUrl: true } },
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, estimatedMinutes: true, published: true } } },
      },
    },
  });
  if (!course || !(await canViewCourse(user, course))) return null;
  // Quem gerencia vê também as aulas em rascunho (pré-visualização); os demais, só as publicadas.
  const manage = canManageCourse(user, course);
  if (!manage) course.modules = course.modules.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.published) }));
  const lessonIds = course.modules.flatMap((m) => m.lessons.filter((l) => l.published).map((l) => l.id));
  const [done, enrollment] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId: user.id, lessonId: { in: lessonIds } }, select: { lessonId: true } }),
    db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  const firstPending = lessonIds.find((id) => !doneSet.has(id)) ?? lessonIds[0] ?? course.modules[0]?.lessons[0]?.id ?? null;
  const resumeId = enrollment?.lastLessonId && lessonIds.includes(enrollment.lastLessonId) ? enrollment.lastLessonId : firstPending;
  return {
    course,
    enrollment,
    done: doneSet,
    total: lessonIds.length,
    percent: percent(doneSet.size, lessonIds.length),
    resumeLessonId: resumeId,
    manage,
    live: isCourseLive(course),
  };
}

/** Abre uma aula: confere acesso, registra matrícula/andamento e devolve o conteúdo. */
export async function openLesson(user: CurrentUser, slug: string, lessonId: string) {
  const view = await getCourseView(user, slug);
  if (!view) return null;
  const ordered = view.course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const idx = ordered.findIndex((l) => l.id === lessonId);
  if (idx < 0) return null; // aula inexistente, de outro curso ou não publicada
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { blocks: { orderBy: { order: "asc" }, include: { file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } } } } },
  });
  // Só registra andamento em aula publicada de curso liberado (pré-visualização não conta).
  const target = ordered[idx];
  if (view.live && target.published) {
    await db.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: view.course.id } },
      create: { userId: user.id, courseId: view.course.id, status: "IN_PROGRESS", source: "self", startedAt: new Date(), lastLessonId: lessonId },
      update: { lastLessonId: lessonId },
    });
    await db.enrollment.updateMany({
      where: { userId: user.id, courseId: view.course.id, status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }
  return { ...view, lesson, position: idx, ordered, prev: ordered[idx - 1] ?? null, next: ordered[idx + 1] ?? null };
}

/** Marca a aula como concluída e atualiza a conclusão do curso. */
export async function completeLesson(user: CurrentUser, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, published: true, module: { select: { course: { select: { id: true, slug: true, status: true, publishAt: true, restricted: true, instructorId: true } } } } },
  });
  const course = lesson?.module.course;
  if (!lesson || !course || !lesson.published || !isCourseLive(course) || !(await canViewCourse(user, course))) {
    throw new ServiceError("Aula não disponível.");
  }
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId },
    update: {},
  });
  return refreshCourseCompletion(user.id, course.id);
}

/**
 * Recalcula a conclusão do curso a partir das aulas publicadas.
 * Retorna true se o curso acabou de ser concluído.
 */
export async function refreshCourseCompletion(userId: string, courseId: string): Promise<boolean> {
  const [total, done, enrollment] = await Promise.all([
    db.lesson.count({ where: { published: true, module: { courseId } } }),
    db.lessonProgress.count({ where: { userId, lesson: { published: true, module: { courseId } } } }),
    db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } }),
  ]);
  const complete = total > 0 && done >= total;
  if (!enrollment) {
    await db.enrollment.create({
      data: { userId, courseId, source: "self", startedAt: new Date(), status: complete ? "COMPLETED" : "IN_PROGRESS", completedAt: complete ? new Date() : null },
    });
  } else if (complete && enrollment.status !== "COMPLETED") {
    await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  } else if (!complete && enrollment.status === "NOT_STARTED") {
    await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  }
  const justCompleted = complete && enrollment?.status !== "COMPLETED";
  if (justCompleted) await audit({ actorId: userId, action: "course.complete", entity: "Course", entityId: courseId });
  return justCompleted;
}

/** Marcas ativas com seus cursos e materiais (página da marca). */
export async function brandForUser(user: CurrentUser, slug: string) {
  const brand = await db.brand.findUnique({
    where: { slug },
    include: {
      materials: { orderBy: { order: "asc" }, include: { file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } } } },
    },
  });
  if (!brand || !brand.active) return null;
  const courses = await db.course.findMany({
    where: { AND: [catalogWhere(user), { brandId: brand.id }] },
    orderBy: { title: "asc" },
    include: { category: { select: { name: true } } },
  });
  const categories = [...new Map(courses.filter((c) => c.category).map((c) => [c.category!.name, c.category!.name])).values()];
  return { brand, courses, categories };
}
