import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { storage } from "@/server/storage/storage";

export const dynamic = "force-dynamic";

/**
 * Entrega arquivos apenas a usuários autenticados.
 * (Fase 3: arquivos de cursos terão também verificação de acesso ao curso.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const asset = await db.fileAsset.findUnique({ where: { id }, select: { storageKey: true, mimeType: true } });
  if (!asset) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const data = await storage().get(asset.storageKey);
  if (!data) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return new NextResponse(Buffer.from(data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
