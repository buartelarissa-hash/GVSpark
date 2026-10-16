"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission, getCurrentUser, AuthorizationError } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import {
  addLesson,
  addModule,
  deleteLesson,
  deleteModule,
  duplicateLesson,
  reorderCourseStructure,
  saveCourse,
  updateModule,
} from "@/server/services/courses";
import { addAssignment, deleteLearningPath, removeAssignment, saveLearningPath } from "@/server/services/assignments";
import { saveCategory } from "@/server/services/catalog";
import { canCreateCourse } from "@/server/services/academy-access";
import { parseDateInput, endOfDaySaoPaulo } from "@/lib/format";
import { fieldErrors, formToObject, optionalId, optionalText, type ActionState } from "@/lib/validation";

const id = z.string().cuid();
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());
const optInt = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int("Use um número inteiro.").min(0).max(max).nullable());

/** Ações da Academy exigem quem pode criar/gerenciar cursos (administrador ou instrutor). */
async function academyActor() {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) throw new AuthorizationError("Sessão expirada. Entre novamente.");
  if (!canCreateCourse(user)) throw new AuthorizationError();
  return user;
}

function revalidateCourse(courseId?: string) {
  revalidatePath("/adm/cursos", "layout");
  revalidatePath("/adm/aulas", "layout");
  if (courseId) revalidatePath(`/adm/cursos/${courseId}`, "layout");
  revalidatePath("/academy", "layout");
  revalidatePath("/inicio");
}

// ---------------------------------------------------------------- Curso

const courseSchema = z.object({
  id: optionalId,
  title: z.string().trim().min(3, "Informe o título do curso.").max(150),
  description: optionalText(2000),
  categoryId: optionalId,
  brandId: optionalId,
  instructorId: optionalId,
  targetAudience: optionalText(300),
  durationMinutes: optInt(100000),
  workloadHours: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))),
    z.number({ invalid_type_error: "Use um número." }).min(0).max(10000).nullable(),
  ),
  level: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]),
  mandatory: checkbox,
  restricted: checkbox,
  publishAt: z.string().optional(),
  dueDays: optInt(3650),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export async function saveCourseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await academyActor();
    const parsed = courseSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };
    const { id: courseId, publishAt, ...rest } = parsed.data;
    const saved = await saveCourse(actor, courseId, { ...rest, publishAt: parseDateInput(publishAt) }, fd);
    revalidateCourse(saved);
    return { ok: true, id: saved, message: "Curso salvo." };
  });
  if (result.ok && !fd.get("id")) redirect(`/adm/cursos/${result.id}`);
  return result;
}

// ---------------------------------------------------------------- Estrutura

const moduleSchema = z.object({ title: z.string().trim().min(2, "Informe o título do módulo.").max(150), description: optionalText(500) });

export async function saveModuleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await academyActor();
    const parsed = moduleSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const courseId = id.parse(fd.get("courseId"));
    const moduleId = optionalId.parse(fd.get("moduleId"));
    if (moduleId) await updateModule(actor, moduleId, parsed.data.title, parsed.data.description);
    else await addModule(actor, courseId, parsed.data.title, parsed.data.description);
    revalidateCourse(courseId);
    return { ok: true };
  });
}

export async function deleteModuleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await academyActor();
    await deleteModule(actor, id.parse(fd.get("id")));
    revalidateCourse(id.parse(fd.get("courseId")));
    return { ok: true };
  });
}

export async function addLessonAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await academyActor();
    const title = z.string().trim().min(2, "Informe o título da aula.").max(150).safeParse(fd.get("title"));
    if (!title.success) return { errors: { title: title.error.issues[0].message } };
    const lessonId = await addLesson(actor, id.parse(fd.get("moduleId")), title.data);
    revalidateCourse(id.parse(fd.get("courseId")));
    return { ok: true, id: lessonId };
  });
  if (result.ok) redirect(`/adm/aulas/${result.id}`);
  return result;
}

export async function deleteLessonAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await academyActor();
    await deleteLesson(actor, id.parse(fd.get("id")));
    revalidateCourse(id.parse(fd.get("courseId")));
    return { ok: true };
  });
}

export async function duplicateLessonAction(fd: FormData): Promise<void> {
  const actor = await academyActor();
  await duplicateLesson(actor, id.parse(fd.get("id")));
  revalidateCourse(id.parse(fd.get("courseId")));
}

const structureSchema = z.array(z.object({ moduleId: id, lessonIds: z.array(id) })).max(500);

/** Chamada direta pelo editor de estrutura (arrastar e soltar). */
export async function reorderStructureAction(courseId: string, structure: unknown): Promise<{ ok: boolean; error?: string }> {
  const r = await runAction(async () => {
    const actor = await academyActor();
    await reorderCourseStructure(actor, id.parse(courseId), structureSchema.parse(structure));
    revalidateCourse(courseId);
    return { ok: true };
  });
  return r.ok ? { ok: true } : { ok: false, error: r.message };
}

// ---------------------------------------------------------------- Atribuições

const assignSchema = z.object({
  courseId: id,
  targetType: z.enum(["ALL", "DEPARTMENT", "POSITION", "USER"]),
  departmentId: optionalId,
  positionId: optionalId,
  dueDate: z.string().optional(),
  mandatory: checkbox,
});

export async function addAssignmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await academyActor();
    const parsed = assignSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const userIds = z.array(id).max(500).parse(fd.getAll("userIds").filter((v) => v !== ""));
    const due = parseDateInput(parsed.data.dueDate);
    const enrolled = await addAssignment(actor, parsed.data.courseId, {
      ...parsed.data,
      userIds,
      dueDate: due ? endOfDaySaoPaulo(due) : null,
    });
    revalidateCourse(parsed.data.courseId);
    return { ok: true, message: `Atribuição salva. ${enrolled} ${enrolled === 1 ? "nova matrícula" : "novas matrículas"}.` };
  });
}

export async function removeAssignmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await academyActor();
    await removeAssignment(actor, id.parse(fd.get("id")));
    revalidateCourse(id.parse(fd.get("courseId")));
    return { ok: true };
  });
}

// ---------------------------------------------------------------- Categorias e trilhas (administrador)

const categorySchema = z.object({
  id: optionalId,
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  description: optionalText(300),
  icon: optionalText(40),
  active: checkbox,
});

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("courses.manage");
    const parsed = categorySchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { id: catId, ...input } = parsed.data;
    await saveCategory(actor, catId, input);
    revalidateCourse();
    return { ok: true };
  });
}

const pathSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(3, "Informe o nome da trilha.").max(100),
  description: optionalText(500),
  positionId: optionalId,
  autoAssign: checkbox,
});

export async function savePathAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("courses.manage");
    const parsed = pathSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const courseIds = z.array(id).min(1, "Selecione ao menos um curso.").max(100).safeParse(fd.getAll("courseIds").filter((v) => v !== ""));
    if (!courseIds.success) return { errors: { courseIds: courseIds.error.issues[0].message } };
    if (parsed.data.autoAssign && !parsed.data.positionId) return { errors: { positionId: "Selecione o cargo para atribuir automaticamente." } };
    const { id: pathId, ...input } = parsed.data;
    await saveLearningPath(actor, pathId, { ...input, courseIds: courseIds.data });
    revalidateCourse();
    return { ok: true };
  });
}

export async function deletePathAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("courses.manage");
    await deleteLearningPath(actor, id.parse(fd.get("id")));
    revalidateCourse();
    return { ok: true };
  });
}
