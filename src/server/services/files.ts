import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { storage } from "@/server/storage/storage";
import { safeFileName, validateImage } from "@/lib/file-validation";
import { ServiceError } from "./users";
import type { CurrentUser } from "@/server/auth/current-user";

export const fileUrl = (id: string) => `/api/arquivos/${id}`;

/** Extrai o id de um FileAsset de uma URL interna (/api/arquivos/<id>). */
export function fileIdFromUrl(url: string | null | undefined): string | null {
  const m = url ? /^\/api\/arquivos\/([a-z0-9]{20,40})$/.exec(url) : null;
  return m ? m[1] : null;
}

/** Valida e salva uma imagem enviada em formulário. Retorna a URL interna. */
export async function saveImageUpload(actor: CurrentUser, file: File, folder: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateImage(bytes);
  if (!check.ok) throw new ServiceError(check.error, "image");
  const now = new Date();
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${check.type.ext}`;
  await storage().put(key, bytes, check.type.mime);
  const asset = await db.fileAsset.create({
    data: {
      storageKey: key,
      originalName: safeFileName(file.name),
      mimeType: check.type.mime,
      sizeBytes: bytes.length,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      uploadedById: actor.id,
    },
    select: { id: true },
  });
  return fileUrl(asset.id);
}

/** Lê o arquivo de um formulário, se houver (campo de arquivo vazio = null). */
export function formFile(fd: FormData, name: string): File | null {
  const v = fd.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}
