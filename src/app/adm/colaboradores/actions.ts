"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { createUser, resetUserPassword, setUserStatus, updateUser } from "@/server/services/users";
import { fieldErrors, formToObject, userFormSchema, type ActionState } from "@/lib/validation";

const idSchema = z.string().cuid();

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    const parsed = userFormSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };
    const { id, temporaryPassword } = await createUser(actor, parsed.data);
    revalidatePath("/adm/colaboradores");
    return { ok: true, message: "Colaborador cadastrado com sucesso.", secret: temporaryPassword, id };
  });
}

export async function updateUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    const id = idSchema.parse(fd.get("id"));
    const parsed = userFormSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };
    await updateUser(actor, id, parsed.data);
    revalidatePath("/adm/colaboradores");
    revalidatePath(`/adm/colaboradores/${id}`);
    return { ok: true, message: "Alterações salvas." };
  });
}

export async function setUserStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    const id = idSchema.parse(fd.get("id"));
    const status = z.enum(["ACTIVE", "INACTIVE"]).parse(fd.get("status"));
    await setUserStatus(actor, id, status);
    revalidatePath("/adm/colaboradores");
    revalidatePath(`/adm/colaboradores/${id}`);
    return { ok: true, message: status === "ACTIVE" ? "Acesso reativado." : "Acesso desativado." };
  });
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission("users.manage");
    const id = idSchema.parse(fd.get("id"));
    const temporaryPassword = await resetUserPassword(actor, id);
    return { ok: true, message: "Nova senha temporária gerada.", secret: temporaryPassword };
  });
}
