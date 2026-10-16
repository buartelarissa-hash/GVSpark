import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { receiveLocalUpload } from "@/server/services/uploads";
import { ServiceError } from "@/server/services/users";
import { FileTooLargeError } from "@/server/storage/storage";

export const dynamic = "force-dynamic";

/** Recebe o arquivo (driver local). Com S3, o navegador envia direto ao bucket. */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token) || !req.body) return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  try {
    await receiveLocalUpload(user.id, token, req.body);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ServiceError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof FileTooLargeError) return NextResponse.json({ error: e.message }, { status: 413 });
    console.error(e);
    return NextResponse.json({ error: "Falha ao receber o arquivo." }, { status: 500 });
  }
}
