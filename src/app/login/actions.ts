"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { createSession, requestMeta } from "@/server/auth/session";
import { isLoginBlocked, recordLoginAttempt } from "@/server/auth/rate-limit";
import { audit } from "@/server/services/audit";
import { homePathFor } from "@/server/permissions/permissions";
import { fieldErrors, formToObject, loginSchema, type ActionState } from "@/lib/validation";
import { safeInternalPath } from "@/lib/utils";

const INVALID = "Usuário ou senha inválidos.";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { username, password, next } = parsed.data;
  const { ip } = await requestMeta();

  if (await isLoginBlocked(username, ip)) {
    return { message: "Muitas tentativas sem sucesso. Aguarde 15 minutos e tente novamente." };
  }

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true, status: true, role: true, mustChangePassword: true },
  });
  if (!user) {
    await burnPasswordCheck(password);
    await recordLoginAttempt(username, ip, false);
    return { message: INVALID };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || user.status !== "ACTIVE") {
    await recordLoginAttempt(username, ip, false);
    // Mesmo texto para usuário inativo: não revela a situação da conta.
    return { message: INVALID };
  }

  await recordLoginAttempt(username, ip, true);
  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login", entity: "User", entityId: user.id });

  if (user.mustChangePassword) redirect("/alterar-senha");
  const fallback = homePathFor(user.role);
  const target = safeInternalPath(next, fallback);
  // Colaborador nunca é enviado ao Portal ADM, mesmo via ?next=.
  redirect(target.startsWith("/adm") && user.role === "COLABORADOR" ? fallback : target);
}
