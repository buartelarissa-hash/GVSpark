"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { completeStep } from "@/server/services/onboarding";
import type { ActionState } from "@/lib/validation";

export async function completeStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("portal.access");
    await completeStep(user, z.string().cuid().parse(fd.get("stepId")));
    revalidatePath("/integracao");
    revalidatePath("/inicio");
    return { ok: true };
  });
}
