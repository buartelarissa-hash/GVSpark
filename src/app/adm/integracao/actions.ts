"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { deleteOrArchiveTrack, deleteStep, moveStep, saveStep, saveTrack } from "@/server/services/onboarding";
import { parseRichDoc, safeHref } from "@/lib/rich-text";
import { fieldErrors, formToObject, optionalId, optionalText, type ActionState } from "@/lib/validation";

const PERM = "content.manage" as const;
const id = z.string().cuid();
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());

function revalidateTracks(trackId?: string) {
  revalidatePath("/adm/integracao");
  if (trackId) revalidatePath(`/adm/integracao/${trackId}`);
  revalidatePath("/integracao");
  revalidatePath("/inicio");
}

const trackSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(3, "Informe o nome da trilha.").max(100),
  description: optionalText(500),
  positionId: optionalId,
  isDefault: checkbox,
  active: checkbox,
  withDefaultSteps: checkbox,
});

export async function saveTrackAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await assertPermission(PERM);
    const parsed = trackSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { id: trackId, withDefaultSteps, ...input } = parsed.data;
    const saved = await saveTrack(actor, trackId, input, withDefaultSteps);
    revalidateTracks(saved);
    return { ok: true, id: saved, message: "Trilha salva." };
  });
  if (result.ok && !fd.get("id")) redirect(`/adm/integracao/${result.id}`);
  return result;
}

export async function deleteTrackAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await assertPermission(PERM);
    const outcome = await deleteOrArchiveTrack(actor, id.parse(fd.get("id")));
    revalidateTracks();
    return { ok: true, message: outcome };
  });
  if (result.ok) redirect("/adm/integracao");
  return result;
}

const stepSchema = z.object({
  id: optionalId,
  trackId: id,
  type: z.enum(["WELCOME", "HISTORY", "VALUES", "ORGCHART", "COURSE", "ASSESSMENT", "CUSTOM", "CONCLUSION"]),
  title: z.string().trim().min(2, "Informe o título da etapa.").max(120),
  description: optionalText(500),
  linkUrl: optionalText(500),
  required: checkbox,
});

export async function saveStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const parsed = stepSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { id: stepId, trackId, ...input } = parsed.data;
    if (input.linkUrl && !safeHref(input.linkUrl)) return { errors: { linkUrl: "Use um link completo, começando com https://" } };
    await saveStep(actor, trackId, stepId, { ...input, content: parseRichDoc(fd.get("content") as string | null) });
    revalidateTracks(trackId);
    return { ok: true, message: "Etapa salva." };
  });
}

export async function deleteStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const trackId = id.parse(fd.get("trackId"));
    await deleteStep(actor, trackId, id.parse(fd.get("id")));
    revalidateTracks(trackId);
    return { ok: true };
  });
}

export async function moveStepAction(fd: FormData): Promise<void> {
  const actor = await assertPermission(PERM);
  const trackId = id.parse(fd.get("trackId"));
  await moveStep(actor, trackId, id.parse(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateTracks(trackId);
}
