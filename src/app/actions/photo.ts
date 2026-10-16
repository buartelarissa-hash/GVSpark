"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, AuthorizationError } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { updateUserPhoto } from "@/server/services/users";
import type { ActionState } from "@/lib/validation";

export async function updatePhotoAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await getCurrentUser();
    if (!actor || actor.mustChangePassword) throw new AuthorizationError("Sessão expirada. Entre novamente.");
    const id = z.string().cuid().parse(fd.get("userId"));
    await updateUserPhoto(actor, id, fd);
    revalidatePath("/", "layout");
    return { ok: true, message: "Foto atualizada." };
  });
}
