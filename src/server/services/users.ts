import "server-only";
import { Prisma, type Role, type UserStatus } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { generateTemporaryPassword, hashPassword } from "@/server/auth/password";
import { destroyUserSessions } from "@/server/auth/session";
import { selfChangeError, userScopeFor } from "@/server/permissions/permissions";
import { parseDateInput } from "@/lib/format";
import type { UserFormInput } from "@/lib/validation";
import type { CurrentUser } from "@/server/auth/current-user";

export const PAGE_SIZE = 20;

export class ServiceError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Filtro Prisma que limita os usuários visíveis a quem consulta. */
export function visibleUsersWhere(actor: Pick<CurrentUser, "id" | "role" | "headedDepartmentIds">): Prisma.UserWhereInput {
  const scope = userScopeFor(actor);
  if (scope.kind === "all") return {};
  if (scope.kind === "team") {
    return {
      OR: [
        { id: actor.id },
        { managerId: actor.id },
        ...(actor.headedDepartmentIds.length ? [{ departmentId: { in: actor.headedDepartmentIds } }] : []),
      ],
    };
  }
  return { id: actor.id };
}

export type UserListFilters = {
  q?: string;
  role?: Role;
  status?: UserStatus;
  departmentId?: string;
  page?: number;
};

export async function listUsers(actor: CurrentUser, filters: UserListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Prisma.UserWhereInput = {
    AND: [
      visibleUsersWhere(actor),
      filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
              { registration: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {},
      filters.role ? { role: filters.role } : {},
      filters.status ? { status: filters.status } : {},
      filters.departmentId ? { departmentId: filters.departmentId } : {},
    ],
  };
  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        registration: true,
        lastLoginAt: true,
        isDemo: true,
        department: { select: { name: true } },
        position: { select: { title: true } },
      },
    }),
  ]);
  return { total, items, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getUserForActor(actor: CurrentUser, id: string) {
  return db.user.findFirst({
    where: { AND: [{ id }, visibleUsersWhere(actor)] },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      registration: true,
      phone: true,
      admissionDate: true,
      departmentId: true,
      positionId: true,
      managerId: true,
      lastLoginAt: true,
      createdAt: true,
      isDemo: true,
      department: { select: { name: true } },
      position: { select: { title: true } },
      manager: { select: { id: true, name: true } },
    },
  });
}

async function validateRelations(input: UserFormInput, selfId?: string) {
  if (input.managerId && input.managerId === selfId) {
    throw new ServiceError("O colaborador não pode ser gestor de si mesmo.", "managerId");
  }
  if (input.positionId) {
    const position = await db.position.findUnique({ where: { id: input.positionId }, select: { departmentId: true } });
    if (!position) throw new ServiceError("Cargo não encontrado.", "positionId");
    if (position.departmentId && input.departmentId && position.departmentId !== input.departmentId) {
      throw new ServiceError("O cargo selecionado pertence a outro departamento.", "positionId");
    }
  }
  if (input.managerId && selfId) {
    // Evita ciclos na cadeia de gestão (A gere B que gere A).
    let cursor: string | null = input.managerId;
    for (let i = 0; cursor && i < 50; i++) {
      if (cursor === selfId) throw new ServiceError("Essa escolha de gestor cria um ciclo na hierarquia.", "managerId");
      const next: { managerId: string | null } | null = await db.user.findUnique({
        where: { id: cursor },
        select: { managerId: true },
      });
      cursor = next?.managerId ?? null;
    }
  }
}

function toUserData(input: UserFormInput) {
  return {
    name: input.name,
    email: input.email,
    role: input.role,
    registration: input.registration,
    phone: input.phone,
    admissionDate: parseDateInput(input.admissionDate),
    departmentId: input.departmentId,
    positionId: input.positionId,
    managerId: input.managerId,
  };
}

function uniqueViolation(e: unknown): ServiceError | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String((e.meta as { target?: string[] } | undefined)?.target ?? "");
    if (target.includes("email")) return new ServiceError("Já existe um usuário com este e-mail.", "email");
    if (target.includes("registration")) return new ServiceError("Matrícula já cadastrada.", "registration");
    return new ServiceError("Registro duplicado.");
  }
  return null;
}

/** Cria usuário com senha temporária (exibida uma única vez ao administrador). */
export async function createUser(actor: CurrentUser, input: UserFormInput) {
  await validateRelations(input);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...toUserData(input), passwordHash, mustChangePassword: true },
        select: { id: true },
      });
      await audit(
        { actorId: actor.id, action: "user.create", entity: "User", entityId: created.id, metadata: { role: input.role } },
        tx,
      );
      return created;
    });
    return { id: user.id, temporaryPassword };
  } catch (e) {
    throw uniqueViolation(e) ?? e;
  }
}

export async function updateUser(actor: CurrentUser, id: string, input: UserFormInput) {
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new ServiceError("Colaborador não encontrado.");
  const selfErr = selfChangeError(actor.id, id, { role: input.role });
  if (selfErr) throw new ServiceError(selfErr, "role");
  await validateRelations(input, id);
  const data = toUserData(input);
  const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => {
    const a = before[k];
    const b = data[k];
    return (a instanceof Date ? a.getTime() : a) !== (b instanceof Date ? b.getTime() : b);
  });
  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await audit({ actorId: actor.id, action: "user.update", entity: "User", entityId: id, metadata: { changed } }, tx);
    });
  } catch (e) {
    throw uniqueViolation(e) ?? e;
  }
  // Mudança de papel encerra sessões ativas, para que permissões antigas não persistam.
  if (before.role !== input.role) await destroyUserSessions(id);
}

export async function setUserStatus(actor: CurrentUser, id: string, status: UserStatus) {
  const selfErr = selfChangeError(actor.id, id, { status });
  if (selfErr) throw new ServiceError(selfErr);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status } });
    await audit(
      { actorId: actor.id, action: status === "ACTIVE" ? "user.activate" : "user.deactivate", entity: "User", entityId: id },
      tx,
    );
  });
  if (status === "INACTIVE") await destroyUserSessions(id);
}

export async function resetUserPassword(actor: CurrentUser, id: string) {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await audit({ actorId: actor.id, action: "user.resetPassword", entity: "User", entityId: id }, tx);
  });
  await destroyUserSessions(id);
  return temporaryPassword;
}

export async function userFormOptions() {
  const [departments, positions, managers] = await Promise.all([
    db.department.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.position.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, departmentId: true, department: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", role: { in: ["ADMIN", "GESTOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { departments, positions, managers };
}
