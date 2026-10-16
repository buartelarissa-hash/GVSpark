"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import {
  deleteAnnouncement,
  deleteSection,
  deleteTimelineEvent,
  moveSection,
  saveAnnouncement,
  saveSection,
  saveTimelineEvent,
  setSectionPublished,
} from "@/server/services/company";
import { parseRichDoc } from "@/lib/rich-text";
import { endOfDaySaoPaulo, parseDateInput } from "@/lib/format";
import { fieldErrors, formToObject, type ActionState } from "@/lib/validation";

const PERM = "content.manage" as const;
const optionalId = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().cuid().optional());
const idSchema = z.string().cuid();
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());

function revalidateContent() {
  revalidatePath("/adm/historia", "layout");
  revalidatePath("/nossa-historia");
  revalidatePath("/inicio");
}

// ---------------------------------------------------------------- Seções

const sectionSchema = z.object({
  type: z.enum(["HISTORY", "FOUNDERS", "MISSION", "VISION", "VALUES", "PURPOSE", "CULTURE", "VIDEO"]),
  title: z.string().trim().min(2, "Informe o título.").max(120),
  videoUrl: z.string().trim().max(500).optional(),
  published: checkbox,
});

export async function saveSectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await assertPermission(PERM);
    const id = optionalId.parse(fd.get("id")) ?? null;
    const parsed = sectionSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };
    const body = parseRichDoc(fd.get("body") as string | null);
    const savedId = await saveSection(
      actor,
      id,
      { ...parsed.data, videoUrl: parsed.data.videoUrl || null, body },
      fd,
    );
    revalidateContent();
    return { ok: true, id: savedId, message: id ? "Seção atualizada." : "Seção criada." };
  });
  if (result.ok && !fd.get("id")) redirect(`/adm/historia/secoes/${result.id}?criada=1`);
  return result;
}

export async function deleteSectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await assertPermission(PERM);
    await deleteSection(actor, idSchema.parse(fd.get("id")));
    revalidateContent();
    return { ok: true };
  });
  if (result.ok && fd.get("redirect") === "1") redirect("/adm/historia");
  return result;
}

export async function publishSectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await setSectionPublished(actor, idSchema.parse(fd.get("id")), fd.get("published") === "true");
    revalidateContent();
    return { ok: true };
  });
}

export async function moveSectionAction(fd: FormData): Promise<void> {
  const actor = await assertPermission(PERM);
  await moveSection(actor, idSchema.parse(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateContent();
}

// ---------------------------------------------------------------- Linha do tempo

const timelineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  title: z.string().trim().min(2, "Informe o título.").max(120),
  description: z.string().trim().max(1000).optional(),
  highlight: checkbox,
  published: checkbox,
});

export async function saveTimelineAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const id = optionalId.parse(fd.get("id")) ?? null;
    const parsed = timelineSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const date = parseDateInput(parsed.data.date);
    if (!date) return { errors: { date: "Data inválida." } };
    await saveTimelineEvent(
      actor,
      id,
      { ...parsed.data, date, description: parsed.data.description || null },
      fd,
    );
    revalidateContent();
    return { ok: true, message: id ? "Marco atualizado." : "Marco adicionado." };
  });
}

export async function deleteTimelineAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await deleteTimelineEvent(actor, idSchema.parse(fd.get("id")));
    revalidateContent();
    return { ok: true };
  });
}

// ---------------------------------------------------------------- Comunicados

const announcementSchema = z.object({
  title: z.string().trim().min(2, "Informe o título.").max(150),
  body: z.string().trim().min(2, "Escreva o comunicado.").max(4000),
  publishMode: z.enum(["now", "draft", "keep"]),
  expiresAt: z.string().optional(),
  pinned: checkbox,
});

export async function saveAnnouncementAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const id = optionalId.parse(fd.get("id")) ?? null;
    const parsed = announcementSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { publishMode, expiresAt, ...rest } = parsed.data;
    const keepDate = fd.get("currentPublishedAt");
    const publishedAt =
      publishMode === "now"
        ? new Date()
        : publishMode === "keep" && typeof keepDate === "string" && keepDate
          ? new Date(keepDate)
          : null;
    const exp = parseDateInput(expiresAt);
    await saveAnnouncement(actor, id, {
      ...rest,
      publishedAt,
      expiresAt: exp ? endOfDaySaoPaulo(exp) : null,
    });
    revalidateContent();
    return { ok: true, message: "Comunicado salvo." };
  });
}

export async function deleteAnnouncementAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await deleteAnnouncement(actor, idSchema.parse(fd.get("id")));
    revalidateContent();
    return { ok: true };
  });
}
