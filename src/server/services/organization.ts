import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./users";
import type { CurrentUser } from "@/server/auth/current-user";

type DepartmentInput = { name: string; description: string | null; parentId: string | null; headId: string | null };
type PositionInput = { title: string; description: string | null; departmentId: string | null };

export async function listDepartments() {
  return db.department.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      isDemo: true,
      parentId: true,
      headId: true,
      parent: { select: { name: true } },
      head: { select: { name: true } },
      _count: { select: { members: { where: { status: "ACTIVE" } }, positions: true } },
    },
  });
}

export async function listPositions() {
  return db.position.findMany({
    orderBy: [{ active: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      active: true,
      isDemo: true,
      departmentId: true,
      department: { select: { name: true } },
      _count: { select: { users: { where: { status: "ACTIVE" } } } },
    },
  });
}

async function assertNoDepartmentCycle(id: string, parentId: string | null) {
  let cursor = parentId;
  for (let i = 0; cursor && i < 50; i++) {
    if (cursor === id) throw new ServiceError("Esse departamento superior cria um ciclo na estrutura.", "parentId");
    const next: { parentId: string | null } | null = await db.department.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = next?.parentId ?? null;
  }
}

function duplicate(e: unknown, message: string, field: string) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return new ServiceError(message, field);
  return e;
}

export async function saveDepartment(actor: CurrentUser, id: string | null, input: DepartmentInput) {
  if (id) await assertNoDepartmentCycle(id, input.parentId);
  try {
    await db.$transaction(async (tx) => {
      const dep = id
        ? await tx.department.update({ where: { id }, data: input })
        : await tx.department.create({ data: input });
      await audit(
        { actorId: actor.id, action: id ? "department.update" : "department.create", entity: "Department", entityId: dep.id },
        tx,
      );
    });
  } catch (e) {
    throw duplicate(e, "Já existe um departamento com este nome.", "name");
  }
}

export async function setDepartmentActive(actor: CurrentUser, id: string, active: boolean) {
  await db.$transaction(async (tx) => {
    await tx.department.update({ where: { id }, data: { active } });
    await audit(
      { actorId: actor.id, action: active ? "department.activate" : "department.archive", entity: "Department", entityId: id },
      tx,
    );
  });
}

export async function savePosition(actor: CurrentUser, id: string | null, input: PositionInput) {
  try {
    await db.$transaction(async (tx) => {
      const pos = id
        ? await tx.position.update({ where: { id }, data: input })
        : await tx.position.create({ data: input });
      await audit(
        { actorId: actor.id, action: id ? "position.update" : "position.create", entity: "Position", entityId: pos.id },
        tx,
      );
    });
  } catch (e) {
    throw duplicate(e, "Já existe um cargo com este nome neste departamento.", "title");
  }
}

export async function setPositionActive(actor: CurrentUser, id: string, active: boolean) {
  await db.$transaction(async (tx) => {
    await tx.position.update({ where: { id }, data: { active } });
    await audit(
      { actorId: actor.id, action: active ? "position.activate" : "position.archive", entity: "Position", entityId: id },
      tx,
    );
  });
}
