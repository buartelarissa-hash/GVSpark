import "server-only";
import { Prisma, type CourseLevel, type CourseStatus, type LessonBlockType } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./errors";
import { formFile, saveImageUpload } from "./files";
import { requireReadyFile } from "./uploads";
import { canCreateCourse, canManageCourse } from "./academy-access";
import { slugify } from "@/lib/slug";
import { blockFileId, fileKindsFor, parseBlockContent } from "@/lib/lesson-blocks";
import { hasPermission } from "@/server/permissions/permissions";
import type { CurrentUser } from "@/server/auth/current-user";

// ---------------------------------------------------------------- Consultas (ADM)

export type CourseFilters = { q?: string; status?: CourseStatus; categoryId?: string; brandId?: string };

/** Cursos que o usuário pode gerenciar: todos (administrador) ou os seus (instrutor). */
export function manageableCoursesWhere(actor: CurrentUser): Prisma.CourseWhereInput {
  return hasPermission(actor.role, "courses.manage") ? {} : { instructorId: actor.id };
}

export async function listCoursesForAdmin(actor: CurrentUser, f: CourseFilters) {
  return db.course.findMany({
    where: {
      AND: [
        manageableCoursesWhere(actor),
        f.q ? { title: { contains: f.q, mode: "insensitive" } } : {},
        f.status ? { status: f.status } : {},
        f.categoryId ? { categoryId: f.categoryId } : {},
        f.brandId ? { brandId: f.brandId } : {},
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      instructor: { select: { name: true } },
      _count: { select: { modules: true, enrollments: true } },
    },
  });
}

/** Carrega o curso para edição, garantindo a permissão. */
export async function getCourseForEdit(actor: CurrentUser, id: string) {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      instructor: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, published: true, estimatedMinutes: true, _count: { select: { blocks: true } } },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course || !canManageCourse(actor, course)) return null;
  return course;
}

async function assertCourse(actor: CurrentUser, courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, instructorId: true } });
  if (!course || !canManageCourse(actor, course)) throw new ServiceError("Curso não encontrado ou sem permissão.");
  return course;
}

async function assertModule(actor: CurrentUser, moduleId: string) {
  const mod = await db.courseModule.findUnique({ where: { id: moduleId }, select: { id: true, courseId: true, course: { select: { instructorId: true } } } });
  if (!mod || !canManageCourse(actor, mod.course)) throw new ServiceError("Módulo não encontrado ou sem permissão.");
  return mod;
}

export async function assertLesson(actor: CurrentUser, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, moduleId: true, module: { select: { courseId: true, course: { select: { instructorId: true } } } } },
  });
  if (!lesson || !canManageCourse(actor, lesson.module.course)) throw new ServiceError("Aula não encontrada ou sem permissão.");
  return { id: lesson.id, moduleId: lesson.moduleId, courseId: lesson.module.courseId };
}

// ---------------------------------------------------------------- Curso

export type CourseInput = {
  title: string;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  instructorId: string | null;
  targetAudience: string | null;
  durationMinutes: number | null;
  workloadHours: number | null;
  level: CourseLevel;
  mandatory: boolean;
  restricted: boolean;
  publishAt: Date | null;
  dueDays: number | null;
  status: CourseStatus;
};

async function uniqueCourseSlug(title: string, exceptId?: string) {
  const root = slugify(title);
  let slug = root;
  for (let i = 2; ; i++) {
    const found = await db.course.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === exceptId) return slug;
    slug = `${root}-${i}`;
  }
}

export async function saveCourse(actor: CurrentUser, id: string | null, input: CourseInput, fd: FormData) {
  if (!canCreateCourse(actor)) throw new ServiceError("Sem permissão para gerenciar cursos.");
  const current = id ? await db.course.findUnique({ where: { id } }) : null;
  if (id && (!current || !canManageCourse(actor, current))) throw new ServiceError("Curso não encontrado ou sem permissão.");

  // Instrutor é sempre o responsável pelos cursos que cria/edita.
  const isAdmin = hasPermission(actor.role, "courses.manage");
  const instructorId = isAdmin ? input.instructorId : actor.id;
  if (instructorId) {
    const instr = await db.user.findUnique({ where: { id: instructorId }, select: { status: true } });
    if (!instr || instr.status !== "ACTIVE") throw new ServiceError("Instrutor não encontrado ou inativo.", "instructorId");
  }
  if (input.status === "PUBLISHED" && current) {
    const published = await db.lesson.count({ where: { published: true, module: { courseId: current.id } } });
    if (!published) throw new ServiceError("Publique ao menos uma aula antes de publicar o curso.", "status");
  } else if (input.status === "PUBLISHED" && !current) {
    throw new ServiceError("Crie o curso como rascunho, adicione as aulas e depois publique.", "status");
  }

  const cover = formFile(fd, "cover");
  const coverUrl = cover ? await saveImageUpload(actor, cover, "capas") : fd.get("coverRemove") === "1" ? null : (current?.coverUrl ?? null);
  const data = {
    ...input,
    instructorId,
    coverUrl,
    workloadHours: input.workloadHours === null ? null : new Prisma.Decimal(input.workloadHours),
    // Publicação sem data definida: vale a partir de agora.
    publishAt: input.status === "PUBLISHED" ? (input.publishAt ?? current?.publishAt ?? new Date()) : input.publishAt,
  };
  return db.$transaction(async (tx) => {
    const row = current
      ? await tx.course.update({ where: { id: current.id }, data: { ...data, isDemo: false, slug: current.title === input.title ? current.slug : await uniqueCourseSlug(input.title, current.id) } })
      : await tx.course.create({ data: { ...data, slug: await uniqueCourseSlug(input.title), createdById: actor.id } });
    await audit(
      {
        actorId: actor.id,
        action: current ? "course.update" : "course.create",
        entity: "Course",
        entityId: row.id,
        metadata: current && current.status !== input.status ? { status: `${current.status}→${input.status}` } : undefined,
      },
      tx,
    );
    return row.id;
  });
}

// ---------------------------------------------------------------- Módulos e aulas

export async function addModule(actor: CurrentUser, courseId: string, title: string, description: string | null) {
  await assertCourse(actor, courseId);
  const order = (await db.courseModule.count({ where: { courseId } })) + 1;
  const row = await db.courseModule.create({ data: { courseId, title, description, order } });
  await audit({ actorId: actor.id, action: "module.create", entity: "CourseModule", entityId: row.id });
}

export async function updateModule(actor: CurrentUser, moduleId: string, title: string, description: string | null) {
  await assertModule(actor, moduleId);
  await db.courseModule.update({ where: { id: moduleId }, data: { title, description } });
  await audit({ actorId: actor.id, action: "module.update", entity: "CourseModule", entityId: moduleId });
}

/** Não exclui conteúdo que já tem progresso de colaboradores — despublique a aula. */
async function assertNoProgress(where: Prisma.LessonProgressWhereInput, what: string) {
  if (await db.lessonProgress.count({ where })) {
    throw new ServiceError(`Este ${what} já foi estudado por colaboradores. Despublique as aulas em vez de excluir, para preservar o histórico.`);
  }
}

export async function deleteModule(actor: CurrentUser, moduleId: string) {
  const mod = await assertModule(actor, moduleId);
  await assertNoProgress({ lesson: { moduleId } }, "módulo");
  await db.$transaction(async (tx) => {
    await tx.courseModule.delete({ where: { id: moduleId } });
    const rest = await tx.courseModule.findMany({ where: { courseId: mod.courseId }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [i, m] of rest.entries()) await tx.courseModule.update({ where: { id: m.id }, data: { order: i + 1 } });
    await audit({ actorId: actor.id, action: "module.delete", entity: "CourseModule", entityId: moduleId }, tx);
  });
}

export async function addLesson(actor: CurrentUser, moduleId: string, title: string) {
  await assertModule(actor, moduleId);
  const order = (await db.lesson.count({ where: { moduleId } })) + 1;
  const row = await db.lesson.create({ data: { moduleId, title, order } });
  await audit({ actorId: actor.id, action: "lesson.create", entity: "Lesson", entityId: row.id });
  return row.id;
}

export type LessonMetaInput = { title: string; description: string | null; estimatedMinutes: number | null; published: boolean };

export async function updateLessonMeta(actor: CurrentUser, lessonId: string, input: LessonMetaInput) {
  await assertLesson(actor, lessonId);
  if (input.published && !(await db.lessonBlock.count({ where: { lessonId } }))) {
    throw new ServiceError("Adicione ao menos um bloco de conteúdo antes de publicar a aula.", "published");
  }
  await db.lesson.update({ where: { id: lessonId }, data: input });
  await audit({ actorId: actor.id, action: input.published ? "lesson.publish" : "lesson.update", entity: "Lesson", entityId: lessonId });
}

export async function deleteLesson(actor: CurrentUser, lessonId: string) {
  const lesson = await assertLesson(actor, lessonId);
  await assertNoProgress({ lessonId }, "conteúdo");
  await db.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lessonId } });
    const rest = await tx.lesson.findMany({ where: { moduleId: lesson.moduleId }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [i, l] of rest.entries()) await tx.lesson.update({ where: { id: l.id }, data: { order: i + 1 } });
    await audit({ actorId: actor.id, action: "lesson.delete", entity: "Lesson", entityId: lessonId }, tx);
  });
}

/** Duplica a aula (com todos os blocos) logo abaixo da original, como rascunho. */
export async function duplicateLesson(actor: CurrentUser, lessonId: string) {
  await assertLesson(actor, lessonId);
  const src = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, include: { blocks: { orderBy: { order: "asc" } } } });
  return db.$transaction(async (tx) => {
    await tx.lesson.updateMany({ where: { moduleId: src.moduleId, order: { gt: src.order } }, data: { order: { increment: 1 } } });
    const copy = await tx.lesson.create({
      data: {
        moduleId: src.moduleId,
        title: `${src.title} (cópia)`,
        description: src.description,
        estimatedMinutes: src.estimatedMinutes,
        order: src.order + 1,
        published: false,
        blocks: {
          create: src.blocks.map((b) => ({ order: b.order, type: b.type, content: b.content as Prisma.InputJsonValue, fileId: b.fileId })),
        },
      },
    });
    await audit({ actorId: actor.id, action: "lesson.duplicate", entity: "Lesson", entityId: copy.id, metadata: { from: lessonId } }, tx);
    return copy.id;
  });
}

/**
 * Salva a estrutura inteira do curso após arrastar e soltar: ordem dos módulos e,
 * em cada um, a ordem das aulas (aulas podem mudar de módulo).
 */
export async function reorderCourseStructure(actor: CurrentUser, courseId: string, structure: { moduleId: string; lessonIds: string[] }[]) {
  await assertCourse(actor, courseId);
  const modules = await db.courseModule.findMany({ where: { courseId }, select: { id: true } });
  const lessons = await db.lesson.findMany({ where: { module: { courseId } }, select: { id: true } });
  const moduleIds = new Set(modules.map((m) => m.id));
  const lessonIds = new Set(lessons.map((l) => l.id));
  const sentModules = structure.map((s) => s.moduleId);
  const sentLessons = structure.flatMap((s) => s.lessonIds);
  const sameSet = (a: string[], b: Set<string>) => a.length === b.size && new Set(a).size === a.length && a.every((x) => b.has(x));
  if (!sameSet(sentModules, moduleIds) || !sameSet(sentLessons, lessonIds)) {
    throw new ServiceError("A estrutura do curso mudou em outra janela. Recarregue a página e tente de novo.");
  }
  await db.$transaction([
    ...structure.map((s, i) => db.courseModule.update({ where: { id: s.moduleId }, data: { order: i + 1 } })),
    ...structure.flatMap((s) => s.lessonIds.map((id, j) => db.lesson.update({ where: { id }, data: { moduleId: s.moduleId, order: j + 1 } }))),
  ]);
  await audit({ actorId: actor.id, action: "course.reorder", entity: "Course", entityId: courseId });
}

// ---------------------------------------------------------------- Blocos

export async function getLessonForEdit(actor: CurrentUser, lessonId: string) {
  await assertLesson(actor, lessonId);
  return db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      blocks: { orderBy: { order: "asc" }, include: { file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } } } },
      module: { select: { id: true, title: true, course: { select: { id: true, title: true, slug: true, status: true } } } },
    },
  });
}

export async function saveBlock(actor: CurrentUser, lessonId: string, id: string | null, type: LessonBlockType, raw: unknown) {
  const lesson = await assertLesson(actor, lessonId);
  const parsed = parseBlockContent(type, raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ServiceError(issue?.message ?? "Conteúdo inválido.", String(issue?.path[0] ?? "content"));
  }
  const content = parsed.data as Prisma.InputJsonValue;
  const fileId = blockFileId(parsed.data);
  if (fileId) await requireReadyFile(fileId, fileKindsFor(type) ?? [], lesson.courseId);
  if (id) {
    const block = await db.lessonBlock.findUnique({ where: { id }, select: { lessonId: true, type: true } });
    if (!block || block.lessonId !== lessonId || block.type !== type) throw new ServiceError("Bloco não encontrado.");
    await db.lessonBlock.update({ where: { id }, data: { content, fileId } });
  } else {
    const order = (await db.lessonBlock.count({ where: { lessonId } })) + 1;
    await db.lessonBlock.create({ data: { lessonId, type, content, fileId, order } });
  }
  await db.lesson.update({ where: { id: lessonId }, data: { updatedAt: new Date() } });
  await audit({ actorId: actor.id, action: id ? "block.update" : "block.create", entity: "Lesson", entityId: lessonId, metadata: { type } });
}

async function assertBlock(actor: CurrentUser, blockId: string) {
  const block = await db.lessonBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new ServiceError("Bloco não encontrado.");
  await assertLesson(actor, block.lessonId);
  return block;
}

export async function deleteBlock(actor: CurrentUser, blockId: string) {
  const block = await assertBlock(actor, blockId);
  await db.$transaction(async (tx) => {
    await tx.lessonBlock.delete({ where: { id: blockId } });
    const rest = await tx.lessonBlock.findMany({ where: { lessonId: block.lessonId }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [i, b] of rest.entries()) await tx.lessonBlock.update({ where: { id: b.id }, data: { order: i + 1 } });
    // Aula publicada sem conteúdo volta a rascunho.
    if (!rest.length) await tx.lesson.update({ where: { id: block.lessonId }, data: { published: false } });
  });
  await audit({ actorId: actor.id, action: "block.delete", entity: "Lesson", entityId: block.lessonId });
}

export async function duplicateBlock(actor: CurrentUser, blockId: string) {
  const block = await assertBlock(actor, blockId);
  await db.$transaction([
    db.lessonBlock.updateMany({ where: { lessonId: block.lessonId, order: { gt: block.order } }, data: { order: { increment: 1 } } }),
    db.lessonBlock.create({
      data: { lessonId: block.lessonId, type: block.type, content: block.content as Prisma.InputJsonValue, fileId: block.fileId, order: block.order + 1 },
    }),
  ]);
  await audit({ actorId: actor.id, action: "block.duplicate", entity: "Lesson", entityId: block.lessonId });
}

export async function reorderBlocks(actor: CurrentUser, lessonId: string, ids: string[]) {
  await assertLesson(actor, lessonId);
  const current = await db.lessonBlock.findMany({ where: { lessonId }, select: { id: true } });
  const set = new Set(current.map((b) => b.id));
  if (ids.length !== set.size || new Set(ids).size !== ids.length || !ids.every((i) => set.has(i))) {
    throw new ServiceError("A aula mudou em outra janela. Recarregue a página e tente de novo.");
  }
  await db.$transaction(ids.map((id, i) => db.lessonBlock.update({ where: { id }, data: { order: i + 1 } })));
}
