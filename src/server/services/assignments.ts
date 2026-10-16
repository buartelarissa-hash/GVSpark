import "server-only";
import type { AssignmentTarget, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./errors";
import { canManageCourse } from "./academy-access";
import { hasPermission } from "@/server/permissions/permissions";
import { endOfDaySaoPaulo } from "@/lib/format";
import type { CurrentUser } from "@/server/auth/current-user";

const DAY = 86_400_000;

/** Prazo de N dias a partir de hoje, valendo até o fim do dia (horário de Brasília). */
export function dueFromDays(days: number, now = new Date()): Date {
  const d = new Date(now.getTime() + days * DAY);
  return endOfDaySaoPaulo(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
}

function usersWhereFor(a: { targetType: AssignmentTarget; departmentId: string | null; positionId: string | null; userId: string | null }): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { status: "ACTIVE" };
  switch (a.targetType) {
    case "ALL":
      return base;
    case "DEPARTMENT":
      return { ...base, departmentId: a.departmentId };
    case "POSITION":
      return { ...base, positionId: a.positionId };
    case "USER":
      return { ...base, id: a.userId! };
  }
}

/**
 * Garante a matrícula de cada usuário no curso. Não altera matrículas concluídas;
 * em matrículas existentes, só torna obrigatória e define prazo se ainda não houver.
 */
async function enrollUsers(
  userIds: string[],
  course: { id: string; dueDays: number | null; mandatory: boolean },
  opts: { source: string; dueDate: Date | null; mandatory: boolean },
) {
  if (!userIds.length) return 0;
  const due = opts.dueDate ?? (course.dueDays ? dueFromDays(course.dueDays) : null);
  const mandatory = opts.mandatory || course.mandatory;
  const created = await db.enrollment.createMany({
    data: userIds.map((userId) => ({ userId, courseId: course.id, source: opts.source, dueDate: due, mandatory })),
    skipDuplicates: true,
  });
  if (mandatory) {
    await db.enrollment.updateMany({
      where: { courseId: course.id, userId: { in: userIds }, status: { not: "COMPLETED" }, mandatory: false },
      data: { mandatory: true },
    });
  }
  if (due) {
    await db.enrollment.updateMany({
      where: { courseId: course.id, userId: { in: userIds }, status: { not: "COMPLETED" }, dueDate: null },
      data: { dueDate: due },
    });
  }
  return created.count;
}

// ---------------------------------------------------------------- Atribuições

export async function listAssignments(courseId: string) {
  return db.courseAssignment.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { name: true } },
      position: { select: { title: true } },
      user: { select: { name: true } },
      assignedBy: { select: { name: true } },
    },
  });
}

export type AssignmentInput = {
  targetType: AssignmentTarget;
  departmentId: string | null;
  positionId: string | null;
  userIds: string[];
  dueDate: Date | null;
  mandatory: boolean;
};

export async function addAssignment(actor: CurrentUser, courseId: string, input: AssignmentInput) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || !canManageCourse(actor, course)) throw new ServiceError("Curso não encontrado ou sem permissão.");
  if (input.targetType === "DEPARTMENT" && !input.departmentId) throw new ServiceError("Selecione o departamento.", "departmentId");
  if (input.targetType === "POSITION" && !input.positionId) throw new ServiceError("Selecione o cargo.", "positionId");
  if (input.targetType === "USER" && !input.userIds.length) throw new ServiceError("Selecione ao menos um colaborador.", "userIds");

  const targets =
    input.targetType === "USER"
      ? input.userIds.map((userId) => ({ targetType: "USER" as const, departmentId: null, positionId: null, userId }))
      : [{ targetType: input.targetType, departmentId: input.departmentId, positionId: input.positionId, userId: null }];

  let enrolled = 0;
  for (const t of targets) {
    await db.courseAssignment.create({
      data: { courseId, ...t, dueDate: input.dueDate, mandatory: input.mandatory, assignedById: actor.id },
    });
    const users = await db.user.findMany({ where: usersWhereFor(t), select: { id: true } });
    enrolled += await enrollUsers(users.map((u) => u.id), course, { source: "assignment", dueDate: input.dueDate, mandatory: input.mandatory });
  }
  await audit({ actorId: actor.id, action: "course.assign", entity: "Course", entityId: courseId, metadata: { target: input.targetType, enrolled } });
  return enrolled;
}

/** Remove a regra. Matrículas já criadas são mantidas (histórico do colaborador). */
export async function removeAssignment(actor: CurrentUser, assignmentId: string) {
  const a = await db.courseAssignment.findUnique({ where: { id: assignmentId }, include: { course: { select: { instructorId: true } } } });
  if (!a || !canManageCourse(actor, a.course)) throw new ServiceError("Atribuição não encontrada.");
  await db.courseAssignment.delete({ where: { id: assignmentId } });
  await audit({ actorId: actor.id, action: "course.unassign", entity: "Course", entityId: a.courseId });
}

// ---------------------------------------------------------------- Trilhas de aprendizagem (por cargo)

export async function listLearningPaths() {
  return db.learningPath.findMany({
    orderBy: { name: "asc" },
    include: {
      position: { select: { title: true } },
      courses: { orderBy: { order: "asc" }, include: { course: { select: { id: true, title: true, status: true } } } },
    },
  });
}

export type PathInput = { name: string; description: string | null; positionId: string | null; autoAssign: boolean; courseIds: string[] };

export async function saveLearningPath(actor: CurrentUser, id: string | null, input: PathInput) {
  if (!hasPermission(actor.role, "courses.manage")) throw new ServiceError("Somente o administrador gerencia trilhas de aprendizagem.");
  const courses = await db.course.findMany({ where: { id: { in: input.courseIds } }, select: { id: true } });
  if (courses.length !== new Set(input.courseIds).size) throw new ServiceError("Curso inválido na trilha.", "courseIds");
  const pathId = await db.$transaction(async (tx) => {
    const data = { name: input.name, description: input.description, positionId: input.positionId, autoAssign: input.autoAssign };
    const row = id ? await tx.learningPath.update({ where: { id }, data }) : await tx.learningPath.create({ data });
    await tx.learningPathCourse.deleteMany({ where: { pathId: row.id } });
    await tx.learningPathCourse.createMany({ data: input.courseIds.map((courseId, i) => ({ pathId: row.id, courseId, order: i + 1 })) });
    await audit({ actorId: actor.id, action: id ? "path.update" : "path.create", entity: "LearningPath", entityId: row.id }, tx);
    return row.id;
  });
  // Aplica a trilha a quem já ocupa o cargo.
  if (input.autoAssign && input.positionId) {
    const users = await db.user.findMany({ where: { status: "ACTIVE", positionId: input.positionId }, select: { id: true } });
    for (const u of users) await applyAssignmentsForUser(u.id);
  }
  return pathId;
}

export async function deleteLearningPath(actor: CurrentUser, id: string) {
  if (!hasPermission(actor.role, "courses.manage")) throw new ServiceError("Somente o administrador gerencia trilhas de aprendizagem.");
  await db.learningPath.delete({ where: { id } });
  await audit({ actorId: actor.id, action: "path.delete", entity: "LearningPath", entityId: id });
}

/**
 * Aplica ao colaborador todas as regras que valem para ele: atribuições (todos,
 * departamento, cargo, individual) e trilhas automáticas do cargo. Chamado ao
 * cadastrar ou alterar departamento/cargo. Idempotente.
 */
export async function applyAssignmentsForUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, status: true, departmentId: true, positionId: true } });
  if (!user || user.status !== "ACTIVE") return;
  const assignments = await db.courseAssignment.findMany({
    where: {
      OR: [
        { targetType: "ALL" },
        ...(user.departmentId ? [{ targetType: "DEPARTMENT" as const, departmentId: user.departmentId }] : []),
        ...(user.positionId ? [{ targetType: "POSITION" as const, positionId: user.positionId }] : []),
        { targetType: "USER", userId: user.id },
      ],
    },
    include: { course: { select: { id: true, dueDays: true, mandatory: true } } },
  });
  for (const a of assignments) {
    await enrollUsers([user.id], a.course, { source: "assignment", dueDate: a.dueDate, mandatory: a.mandatory });
  }
  if (user.positionId) {
    const paths = await db.learningPath.findMany({
      where: { positionId: user.positionId, autoAssign: true },
      include: { courses: { include: { course: { select: { id: true, dueDays: true, mandatory: true } } } } },
    });
    for (const p of paths) {
      for (const pc of p.courses) await enrollUsers([user.id], pc.course, { source: "path", dueDate: null, mandatory: true });
    }
  }
}
