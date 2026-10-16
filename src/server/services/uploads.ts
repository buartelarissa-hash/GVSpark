import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { storage, type LocalStorageDriver, type S3StorageDriver } from "@/server/storage/storage";
import { classifyFile, expectedKind, FILE_KIND_LABELS, maxBytesFor, safeFileName, type FileKind } from "@/lib/file-validation";
import { hasPermission } from "@/server/permissions/permissions";
import { canManageCourse } from "./academy-access";
import { ServiceError } from "./errors";
import { audit } from "./audit";
import type { CurrentUser } from "@/server/auth/current-user";

const ALL_KINDS: FileKind[] = ["image", "pdf", "presentation", "document", "video"];
const UPLOAD_TTL_MS = 2 * 3600_000;
const HEAD_BYTES = 4100;

export type UploadTarget = { type: "course"; courseId: string } | { type: "brand" };

export type UploadTicket = { fileId: string; url: string; method: "PUT"; headers: Record<string, string> };

async function assertCanUpload(actor: CurrentUser, target: UploadTarget) {
  if (target.type === "course") {
    const course = await db.course.findUnique({ where: { id: target.courseId }, select: { instructorId: true } });
    if (!course || !canManageCourse(actor, course)) throw new ServiceError("Você não pode enviar arquivos para este curso.");
  } else if (!hasPermission(actor.role, "courses.manage")) {
    throw new ServiceError("Você não pode enviar arquivos de marcas parceiras.");
  }
}

/** Remove uploads iniciados e nunca confirmados. */
export async function cleanupExpiredUploads() {
  const expired = await db.fileAsset.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { id: true, storageKey: true },
    take: 50,
  });
  for (const f of expired) {
    await storage().remove(f.storageKey).catch(() => undefined);
    await db.fileAsset.delete({ where: { id: f.id } }).catch(() => undefined);
  }
}

/** Etapa 1: valida nome/tamanho, reserva o arquivo e devolve para onde enviar. */
export async function startUpload(
  actor: CurrentUser,
  input: { fileName: string; size: number; target: UploadTarget; kinds?: FileKind[] },
): Promise<UploadTicket> {
  await assertCanUpload(actor, input.target);
  const expected = expectedKind(input.fileName);
  const allowed = input.kinds?.length ? input.kinds : ALL_KINDS;
  if (!expected || !allowed.includes(expected.kind)) {
    throw new ServiceError(`Tipo de arquivo não aceito aqui. Envie: ${allowed.map((k) => FILE_KIND_LABELS[k]).join(", ")}.`);
  }
  const max = maxBytesFor(expected.kind, process.env);
  if (!Number.isInteger(input.size) || input.size <= 0) throw new ServiceError("O arquivo está vazio.");
  if (input.size > max) throw new ServiceError(`O arquivo excede o limite de ${Math.round(max / 1048576)} MB.`);
  void cleanupExpiredUploads().catch(() => undefined);

  const now = new Date();
  const folder = input.target.type === "course" ? `cursos/${input.target.courseId}` : "marcas";
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${expected.ext}`;
  const token = randomBytes(24).toString("hex");
  const asset = await db.fileAsset.create({
    data: {
      storageKey: key,
      originalName: safeFileName(input.fileName),
      mimeType: expected.mime,
      sizeBytes: input.size,
      status: "PENDING",
      uploadToken: token,
      expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
      courseId: input.target.type === "course" ? input.target.courseId : null,
      uploadedById: actor.id,
    },
    select: { id: true },
  });

  const driver = storage();
  if (driver.kind === "s3") {
    const url = await (driver as S3StorageDriver).presignPut(key, expected.mime, 3600);
    return { fileId: asset.id, url, method: "PUT", headers: { "Content-Type": expected.mime } };
  }
  return { fileId: asset.id, url: `/api/uploads/${token}`, method: "PUT", headers: { "Content-Type": expected.mime } };
}

/** Driver local: recebe o corpo do PUT em streaming. */
export async function receiveLocalUpload(actorId: string, token: string, body: ReadableStream<Uint8Array>) {
  const asset = await db.fileAsset.findUnique({ where: { uploadToken: token } });
  if (!asset || asset.status !== "PENDING" || asset.uploadedById !== actorId || !asset.expiresAt || asset.expiresAt < new Date()) {
    throw new ServiceError("Envio inválido ou expirado.");
  }
  const driver = storage();
  if (driver.kind !== "local") throw new ServiceError("Envio direto indisponível neste armazenamento.");
  await (driver as LocalStorageDriver).writeStream(asset.storageKey, body, asset.sizeBytes);
}

/** Etapa final: confere tamanho e conteúdo real do arquivo enviado. */
export async function finalizeUpload(actor: CurrentUser, fileId: string) {
  const asset = await db.fileAsset.findUnique({ where: { id: fileId } });
  if (!asset || asset.uploadedById !== actor.id) throw new ServiceError("Arquivo não encontrado.");
  if (asset.status === "READY") return asset;
  const fail = async (message: string) => {
    await storage().remove(asset.storageKey).catch(() => undefined);
    await db.fileAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
    throw new ServiceError(message);
  };
  const size = await storage().size(asset.storageKey);
  if (size === null) return fail("O envio do arquivo não foi concluído. Tente novamente.");
  if (size !== asset.sizeBytes) return fail("O arquivo recebido está incompleto. Tente novamente.");
  const head = await storage().head(asset.storageKey, HEAD_BYTES);
  const check = classifyFile(asset.originalName, head, size, ALL_KINDS, process.env);
  if (!check.ok) return fail(check.error);
  const ready = await db.fileAsset.update({
    where: { id: asset.id },
    data: { status: "READY", mimeType: check.mime, uploadToken: null, expiresAt: null },
  });
  await audit({ actorId: actor.id, action: "file.upload", entity: "FileAsset", entityId: asset.id, metadata: { size, mime: check.mime } });
  return ready;
}

/** Garante que o arquivo existe, está pronto e é do tipo esperado (ao salvar um bloco/material). */
export async function requireReadyFile(fileId: string, kinds: FileKind[], courseId: string | null) {
  const asset = await db.fileAsset.findUnique({ where: { id: fileId } });
  if (!asset || asset.status !== "READY") throw new ServiceError("Arquivo não encontrado. Envie novamente.", "file");
  if (courseId !== asset.courseId) throw new ServiceError("Arquivo pertence a outro curso.", "file");
  const kind = expectedKind(asset.originalName)?.kind;
  if (!kind || !kinds.includes(kind)) throw new ServiceError("Tipo de arquivo não compatível com este bloco.", "file");
  return asset;
}
