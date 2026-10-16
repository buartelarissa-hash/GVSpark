import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { storage, type LocalStorageDriver, type S3StorageDriver } from "@/server/storage/storage";
import { canViewCourseById } from "@/server/services/academy-access";
import { isInlineMime } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Não encontrado." }, { status: 404 });

/**
 * Entrega arquivos somente a usuários autenticados.
 * Arquivos de curso exigem acesso ao curso (publicado e liberado para a pessoa,
 * ou gestão do curso). Suporta Range para vídeos (avançar/retroceder).
 * Com S3, redireciona para uma URL assinada que expira em poucos minutos.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return notFound();
  const asset = await db.fileAsset.findUnique({
    where: { id },
    select: { storageKey: true, mimeType: true, sizeBytes: true, originalName: true, status: true, courseId: true },
  });
  if (!asset || asset.status !== "READY") return notFound();
  if (asset.courseId && !(await canViewCourseById(user, asset.courseId))) return notFound();

  const download = new URL(req.url).searchParams.get("download") === "1";
  const inline = !download && isInlineMime(asset.mimeType);
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`;
  const driver = storage();

  if (driver.kind === "s3") {
    const url = await (driver as S3StorageDriver).presignGet(asset.storageKey, {
      fileName: asset.originalName,
      contentType: asset.mimeType,
      inline,
      expiresSeconds: 300,
    });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  const local = driver as LocalStorageDriver;
  const size = await local.size(asset.storageKey);
  if (size === null) return notFound();
  const headers: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    // O visualizador de PDF do navegador não funciona em modo "sandbox".
    "Content-Security-Policy":
      asset.mimeType === "application/pdf"
        ? "default-src 'none'; object-src 'self'; frame-ancestors 'self'"
        : "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'self'",
  };

  const range = req.headers.get("range");
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    if (!m[1]) end = size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new NextResponse(local.readStream(asset.storageKey, { start, end }), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new NextResponse(local.readStream(asset.storageKey), { headers: { ...headers, "Content-Length": String(size) } });
}
