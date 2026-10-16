import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requestMeta } from "@/server/auth/session";

type AuditInput = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function audit(input: AuditInput, tx: Prisma.TransactionClient = db) {
  const { ip } = await requestMeta().catch(() => ({ ip: null }));
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ip,
    },
  });
}
