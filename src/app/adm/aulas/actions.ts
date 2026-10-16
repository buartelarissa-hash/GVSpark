"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, AuthorizationError } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { assertLesson, deleteBlock, duplicateBlock, reorderBlocks, saveBlock, updateLessonMeta } from "@/server/services/courses";
import { canCreateCourse } from "@/server/services/academy-access";
import { ServiceError } from "@/server/services/errors";
import { fieldErrors, formToObject, optionalText, type ActionState } from "@/lib/validation";

const id = z.string().cuid();
const BLOCK_TYPES = ["RICH_TEXT", "IMAGE", "VIDEO_UPLOAD", "VIDEO_EMBED", "PDF", "PRESENTATION", "LINK", "ACTIVITY", "ATTACHMENT"] as const;

async function actor() {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) throw new AuthorizationError("Sessão expirada. Entre novamente.");
  if (!canCreateCourse(user)) throw new AuthorizationError();
  return user;
}

function revalidateLesson(lessonId: string, courseId: string) {
  revalidatePath(`/adm/aulas/${lessonId}`);
  revalidatePath(`/adm/cursos/${courseId}`, "layout");
  revalidatePath("/academy", "layout");
}

const metaSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da aula.").max(150),
  description: optionalText(500),
  estimatedMinutes: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(10000).nullable()),
  published: z.preprocess((v) => v === "on", z.boolean()),
});

export async function updateLessonMetaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    const lessonId = id.parse(fd.get("lessonId"));
    const parsed = metaSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const lesson = await assertLesson(user, lessonId);
    await updateLessonMeta(user, lessonId, parsed.data);
    revalidateLesson(lessonId, lesson.courseId);
    return { ok: true, message: parsed.data.published ? "Aula salva e publicada." : "Aula salva como rascunho." };
  });
}

export type BlockResult = { ok: true } | { ok: false; error: string; field?: string };

/** Chamada direta pelo editor de blocos (conteúdo estruturado). */
export async function saveBlockAction(lessonId: string, blockId: string | null, type: string, content: unknown): Promise<BlockResult> {
  try {
    const user = await actor();
    const lesson = await assertLesson(user, id.parse(lessonId));
    await saveBlock(user, lesson.id, blockId ? id.parse(blockId) : null, z.enum(BLOCK_TYPES).parse(type), content);
    revalidateLesson(lesson.id, lesson.courseId);
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message, field: e.field };
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Não foi possível salvar o bloco." };
  }
}

export async function deleteBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actor();
    const lesson = await assertLesson(user, id.parse(fd.get("lessonId")));
    await deleteBlock(user, id.parse(fd.get("id")));
    revalidateLesson(lesson.id, lesson.courseId);
    return { ok: true };
  });
}

export async function duplicateBlockAction(fd: FormData): Promise<void> {
  const user = await actor();
  const lesson = await assertLesson(user, id.parse(fd.get("lessonId")));
  await duplicateBlock(user, id.parse(fd.get("id")));
  revalidateLesson(lesson.id, lesson.courseId);
}

export async function reorderBlocksAction(lessonId: string, ids: string[]): Promise<{ ok: boolean; error?: string }> {
  const r = await runAction(async () => {
    const user = await actor();
    const lesson = await assertLesson(user, id.parse(lessonId));
    await reorderBlocks(user, lesson.id, z.array(id).max(300).parse(ids));
    revalidateLesson(lesson.id, lesson.courseId);
    return { ok: true };
  });
  return r.ok ? { ok: true } : { ok: false, error: r.message };
}
