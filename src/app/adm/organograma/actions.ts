"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import {
  deactivateOrgPosition,
  importOrgFromUsers,
  moveOrgPosition,
  reactivateOrgPosition,
  saveOrgPosition,
} from "@/server/services/org-chart";
import { fieldErrors, formToObject, optionalId, optionalText, type ActionState } from "@/lib/validation";

const PERM = "org.manage" as const;
const idSchema = z.string().cuid();

function revalidateOrg() {
  revalidatePath("/adm/organograma");
  revalidatePath("/organograma");
}

const schema = z.object({
  id: optionalId,
  title: z.string().trim().min(2, "Informe o título da posição.").max(100),
  responsibilities: optionalText(2000),
  parentId: optionalId,
  departmentId: optionalId,
  userId: optionalId,
});

export async function saveOrgPositionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const parsed = schema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { id, ...input } = parsed.data;
    await saveOrgPosition(actor, id, input);
    revalidateOrg();
    return { ok: true, message: "Posição salva." };
  });
}

export async function moveOrgPositionAction(fd: FormData): Promise<void> {
  const actor = await assertPermission(PERM);
  await moveOrgPosition(actor, idSchema.parse(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateOrg();
}

export async function deactivateOrgPositionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await deactivateOrgPosition(actor, idSchema.parse(fd.get("id")));
    revalidateOrg();
    return { ok: true };
  });
}

export async function reactivateOrgPositionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await reactivateOrgPosition(actor, idSchema.parse(fd.get("id")));
    revalidateOrg();
    return { ok: true };
  });
}

export async function importOrgAction(): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const created = await importOrgFromUsers(actor);
    revalidateOrg();
    return {
      ok: true,
      message: created
        ? `${created} ${created === 1 ? "posição criada" : "posições criadas"} a partir dos cadastros.`
        : "Todos os colaboradores ativos já estão no organograma.",
    };
  });
}
