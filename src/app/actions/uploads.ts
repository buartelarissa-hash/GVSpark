"use server";

import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { finalizeUpload, startUpload, type UploadTicket } from "@/server/services/uploads";
import { ServiceError } from "@/server/services/errors";

export type UploadedFile = { id: string; name: string; size: number; mime: string };
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const startSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z.number().int().positive(),
  kinds: z.array(z.enum(["image", "pdf", "presentation", "document", "video"])).max(5).optional(),
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("course"), courseId: z.string().cuid() }),
    z.object({ type: z.literal("brand") }),
  ]),
});

async function guard<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Não foi possível enviar o arquivo." };
  }
}

export async function startUploadAction(input: z.input<typeof startSchema>): Promise<Result<UploadTicket>> {
  return guard(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ServiceError("Sessão expirada. Entre novamente.");
    const parsed = startSchema.parse(input);
    return startUpload(user, parsed);
  });
}

export async function finalizeUploadAction(fileId: string): Promise<Result<UploadedFile>> {
  return guard(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ServiceError("Sessão expirada. Entre novamente.");
    const f = await finalizeUpload(user, z.string().cuid().parse(fileId));
    return { id: f.id, name: f.originalName, size: f.sizeBytes, mime: f.mimeType };
  });
}
