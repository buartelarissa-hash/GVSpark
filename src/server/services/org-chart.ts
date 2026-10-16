import "server-only";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./users";
import { wouldCreateCycle } from "@/lib/org-tree";
import type { CurrentUser } from "@/server/auth/current-user";

export type OrgPositionInput = {
  title: string;
  responsibilities: string | null;
  parentId: string | null;
  departmentId: string | null;
  userId: string | null;
};

const nodeSelect = {
  id: true,
  title: true,
  responsibilities: true,
  order: true,
  active: true,
  isDemo: true,
  parentId: true,
  departmentId: true,
  userId: true,
  department: { select: { name: true } },
  user: {
    select: { id: true, name: true, avatarUrl: true, status: true, position: { select: { title: true } } },
  },
} as const;

export async function listOrgPositions(includeInactive: boolean) {
  return db.orgPosition.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: nodeSelect,
  });
}

async function validate(id: string | null, input: OrgPositionInput) {
  if (input.parentId) {
    const all = await db.orgPosition.findMany({ select: { id: true, parentId: true, order: true, active: true } });
    const parent = all.find((n) => n.id === input.parentId);
    if (!parent || !parent.active) throw new ServiceError("Posição superior não encontrada.", "parentId");
    if (id && wouldCreateCycle(all, id, input.parentId)) {
      throw new ServiceError("Não é possível subordinar uma posição a ela mesma ou a uma posição abaixo dela.", "parentId");
    }
  }
  if (input.userId) {
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { status: true } });
    if (!user || user.status !== "ACTIVE") throw new ServiceError("Colaborador não encontrado ou inativo.", "userId");
  }
}

export async function saveOrgPosition(actor: CurrentUser, id: string | null, input: OrgPositionInput) {
  await validate(id, input);
  await db.$transaction(async (tx) => {
    let row;
    if (id) {
      const before = await tx.orgPosition.findUnique({ where: { id } });
      if (!before) throw new ServiceError("Posição não encontrada.");
      // Mudou de posição superior: entra no fim da nova lista de subordinados.
      const order =
        before.parentId !== input.parentId
          ? (await tx.orgPosition.count({ where: { parentId: input.parentId, active: true } })) + 1
          : before.order;
      row = await tx.orgPosition.update({ where: { id }, data: { ...input, order, isDemo: false } });
    } else {
      const order = (await tx.orgPosition.count({ where: { parentId: input.parentId, active: true } })) + 1;
      row = await tx.orgPosition.create({ data: { ...input, order } });
    }
    await audit(
      { actorId: actor.id, action: id ? "org.update" : "org.create", entity: "OrgPosition", entityId: row.id },
      tx,
    );
  });
}

export async function moveOrgPosition(actor: CurrentUser, id: string, direction: "up" | "down") {
  const node = await db.orgPosition.findUnique({ where: { id } });
  if (!node) throw new ServiceError("Posição não encontrada.");
  const siblings = await db.orgPosition.findMany({
    where: { parentId: node.parentId, active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= siblings.length) return;
  [siblings[idx], siblings[swap]] = [siblings[swap], siblings[idx]];
  await db.$transaction(siblings.map((s, i) => db.orgPosition.update({ where: { id: s.id }, data: { order: i + 1 } })));
  await audit({ actorId: actor.id, action: "org.reorder", entity: "OrgPosition", entityId: id });
}

/**
 * Desativa uma posição. As posições subordinadas sobem um nível
 * (passam a responder à posição superior da desativada), para não sumirem do organograma.
 */
export async function deactivateOrgPosition(actor: CurrentUser, id: string) {
  await db.$transaction(async (tx) => {
    const node = await tx.orgPosition.findUnique({ where: { id } });
    if (!node) throw new ServiceError("Posição não encontrada.");
    const moved = await tx.orgPosition.updateMany({ where: { parentId: id }, data: { parentId: node.parentId } });
    await tx.orgPosition.update({ where: { id }, data: { active: false, parentId: null } });
    await audit(
      { actorId: actor.id, action: "org.deactivate", entity: "OrgPosition", entityId: id, metadata: { childrenMoved: moved.count } },
      tx,
    );
  });
}

export async function reactivateOrgPosition(actor: CurrentUser, id: string) {
  await db.$transaction(async (tx) => {
    const order = (await tx.orgPosition.count({ where: { parentId: null, active: true } })) + 1;
    await tx.orgPosition.update({ where: { id }, data: { active: true, parentId: null, order } });
    await audit({ actorId: actor.id, action: "org.activate", entity: "OrgPosition", entityId: id }, tx);
  });
}

/**
 * Cria posições no organograma para colaboradores ativos que ainda não têm uma,
 * seguindo a cadeia de gestores do cadastro. Não altera posições existentes.
 */
export async function importOrgFromUsers(actor: CurrentUser): Promise<number> {
  const users = await db.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      managerId: true,
      departmentId: true,
      position: { select: { title: true, description: true } },
      orgPositions: { where: { active: true }, select: { id: true }, take: 1 },
    },
  });
  const posByUser = new Map<string, string>();
  for (const u of users) if (u.orgPositions[0]) posByUser.set(u.id, u.orgPositions[0].id);
  const pending = users.filter((u) => !posByUser.has(u.id));
  const ids = new Set(users.map((u) => u.id));

  let created = 0;
  // Processa em ondas: primeiro quem não tem gestor (ou cujo gestor já está no organograma).
  for (let guard = 0; pending.length && guard < users.length + 1; guard++) {
    const ready = pending.filter((u) => !u.managerId || !ids.has(u.managerId) || posByUser.has(u.managerId));
    if (!ready.length) break;
    for (const u of ready) {
      const parentId = u.managerId ? (posByUser.get(u.managerId) ?? null) : null;
      const order = (await db.orgPosition.count({ where: { parentId, active: true } })) + 1;
      const row = await db.orgPosition.create({
        data: {
          title: u.position?.title ?? "Colaborador",
          responsibilities: u.position?.description ?? null,
          userId: u.id,
          departmentId: u.departmentId,
          parentId,
          order,
        },
      });
      posByUser.set(u.id, row.id);
      pending.splice(pending.indexOf(u), 1);
      created++;
    }
  }
  if (created) await audit({ actorId: actor.id, action: "org.import", entity: "OrgPosition", metadata: { created } });
  return created;
}
