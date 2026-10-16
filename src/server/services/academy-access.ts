import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import { hasPermission } from "@/server/permissions/permissions";

type Actor = { id: string; role: Role };

/** Administrador gerencia todos os cursos; instrutor, só os que estão sob sua responsabilidade. */
export function canManageCourse(actor: Actor, course: { instructorId: string | null }): boolean {
  if (hasPermission(actor.role, "courses.manage")) return true;
  return hasPermission(actor.role, "courses.manageOwn") && course.instructorId === actor.id;
}

export function canCreateCourse(actor: Actor): boolean {
  return hasPermission(actor.role, "courses.manage") || hasPermission(actor.role, "courses.manageOwn");
}

/** Curso publicado e já liberado pela data de publicação. */
export function isCourseLive(course: { status: string; publishAt: Date | null }, now = new Date()): boolean {
  return course.status === "PUBLISHED" && (!course.publishAt || course.publishAt <= now);
}

/**
 * Pode o colaborador ver o curso (e baixar seus arquivos)?
 * Publicado + liberado + (aberto no catálogo OU atribuído/matriculado).
 * Quem gerencia o curso sempre pode (inclusive rascunhos, para pré-visualizar).
 */
export async function canViewCourse(
  actor: Actor,
  course: { id: string; status: string; publishAt: Date | null; restricted: boolean; instructorId: string | null },
): Promise<boolean> {
  if (canManageCourse(actor, course)) return true;
  if (!isCourseLive(course)) return false;
  if (!course.restricted) return true;
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: actor.id, courseId: course.id } },
    select: { id: true },
  });
  return !!enrollment;
}

export async function canViewCourseById(actor: Actor, courseId: string): Promise<boolean> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, publishAt: true, restricted: true, instructorId: true },
  });
  return !!course && (await canViewCourse(actor, course));
}
