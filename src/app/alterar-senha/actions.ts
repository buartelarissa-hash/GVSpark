"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/server/auth/password";
import { destroyUserSessions, hashToken, readSessionToken } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { homePathFor } from "@/server/permissions/permissions";
import { formToObject, type ActionState } from "@/lib/validation";

const schema = z.object({
  current: z.string().min(1).max(128),
  password: z.string().max(128),
  confirm: z.string().max(128),
});

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = schema.safeParse(formToObject(fd));
  if (!parsed.success) return { errors: { current: "Informe a senha atual." } };
  const { current, password, confirm } = parsed.data;

  const policy = passwordPolicyError(password);
  if (policy) return { errors: { password: policy } };
  if (password !== confirm) return { errors: { confirm: "As senhas não conferem." } };
  if (password === current) return { errors: { password: "A nova senha deve ser diferente da atual." } };

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, record.passwordHash))) return { errors: { current: "Senha atual incorreta." } };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: false },
  });
  // Encerra as demais sessões do usuário, mantendo a atual.
  const token = await readSessionToken();
  await destroyUserSessions(user.id, token ? hashToken(token) : undefined);
  await audit({ actorId: user.id, action: "auth.changePassword", entity: "User", entityId: user.id });

  if (user.mustChangePassword) redirect(homePathFor(user.role));
  return { ok: true, message: "Senha alterada com sucesso." };
}
