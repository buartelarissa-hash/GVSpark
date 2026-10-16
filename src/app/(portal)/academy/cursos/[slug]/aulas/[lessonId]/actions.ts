"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { completeLesson } from "@/server/services/learning";
import type { ActionState } from "@/lib/validation";

export async function completeLessonAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("portal.access");
    const courseCompleted = await completeLesson(user, z.string().cuid().parse(fd.get("lessonId")));
    revalidatePath("/academy", "layout");
    revalidatePath("/inicio");
    revalidatePath("/integracao");
    return { ok: true, message: courseCompleted ? "course-completed" : "lesson-completed" };
  });
}
