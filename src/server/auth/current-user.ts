import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { hashToken, readSessionToken } from "./session";
import { hasPermission, type Permission } from "@/server/permissions/permissions";

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  admissionDate: true,
  mustChangePassword: true,
  managerId: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
  headOfDepartment: { select: { id: true } },
} as const;

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

async function loadUser() {
  const token = await readSessionToken();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, user: { select: userSelect } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { ...session.user, headedDepartmentIds: session.user.headOfDepartment.map((d) => d.id) };
}

/** Usuário autenticado da requisição atual (memoizado por requisição). */
export const getCurrentUser = cache(loadUser);

export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para realizar esta ação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Para páginas: redireciona ao login se não houver sessão válida. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/alterar-senha");
  return user;
}

/** Para páginas: exige permissão; sem ela, envia à página de acesso negado. */
export async function requirePagePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/acesso-negado");
  return user;
}

/**
 * Para server actions e rotas de API: lança AuthorizationError em vez de
 * redirecionar, para que a ação nunca seja executada sem permissão.
 */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) throw new AuthorizationError("Sessão expirada. Entre novamente.");
  if (!hasPermission(user.role, permission)) throw new AuthorizationError();
  return user;
}

/** Para páginas: exige ao menos uma das permissões. */
export async function requireAnyPagePermission(permissions: Permission[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!permissions.some((p) => hasPermission(user.role, p))) redirect("/acesso-negado");
  return user;
}
