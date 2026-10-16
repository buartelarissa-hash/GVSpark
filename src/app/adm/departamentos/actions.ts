"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import {
  saveDepartment,
  savePosition,
  setDepartmentActive,
  setPositionActive,
} from "@/server/services/organization";
import { departmentFormSchema, fieldErrors, formToObject, positionFormSchema, type ActionState } from "@/lib/validation";

const optionalId = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().cuid().optional());
const PATH = "/adm/departamentos";

export async function saveDepartmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("org.manage");
    const id = optionalId.parse(fd.get("id")) ?? null;
    const parsed = departmentFormSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    if (id && parsed.data.parentId === id) return { errors: { parentId: "Um departamento não pode ser superior de si mesmo." } };
    await saveDepartment(actor, id, parsed.data);
    revalidatePath(PATH);
    return { ok: true, message: id ? "Departamento atualizado." : "Departamento criado." };
  });
}

export async function savePositionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("org.manage");
    const id = optionalId.parse(fd.get("id")) ?? null;
    const parsed = positionFormSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    await savePosition(actor, id, parsed.data);
    revalidatePath(PATH);
    return { ok: true, message: id ? "Cargo atualizado." : "Cargo criado." };
  });
}

const toggleSchema = z.object({ id: z.string().cuid(), active: z.enum(["true", "false"]) });

export async function toggleDepartmentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("org.manage");
    const { id, active } = toggleSchema.parse(formToObject(fd));
    await setDepartmentActive(actor, id, active === "true");
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function togglePositionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("org.manage");
    const { id, active } = toggleSchema.parse(formToObject(fd));
    await setPositionActive(actor, id, active === "true");
    revalidatePath(PATH);
    return { ok: true };
  });
}
