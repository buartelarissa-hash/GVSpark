import "server-only";
import { Prisma, type OnboardingStepType } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./users";
import { canCompleteManually, computeOnboarding, defaultStepRows } from "@/lib/onboarding";
import type { RichDoc } from "@/lib/rich-text";
import type { CurrentUser } from "@/server/auth/current-user";

const stepSelect = {
  id: true,
  order: true,
  type: true,
  title: true,
  description: true,
  content: true,
  linkUrl: true,
  required: true,
  refId: true,
} as const;

/** Trilha do colaborador: a do cargo (se ativa) ou a trilha padrão. */
export async function trackForUser(user: { position: { id: string } | null }) {
  const include = { steps: { orderBy: { order: "asc" as const }, select: stepSelect } };
  if (user.position) {
    const own = await db.onboardingTrack.findFirst({ where: { positionId: user.position.id, active: true }, include });
    if (own) return own;
  }
  return db.onboardingTrack.findFirst({ where: { isDefault: true, active: true }, include });
}

export async function getUserOnboarding(user: CurrentUser) {
  const track = await trackForUser(user);
  if (!track) return null;
  const progress = await db.onboardingProgress.findMany({
    where: { userId: user.id, stepId: { in: track.steps.map((s) => s.id) } },
    select: { stepId: true, completedAt: true },
  });
  const completedAt = new Map(progress.map((p) => [p.stepId, p.completedAt]));
  const summary = computeOnboarding(track.steps, new Set(completedAt.keys()));
  return { track, completedAt, ...summary };
}

/** Colaborador conclui uma etapa manual da própria trilha. */
export async function completeStep(user: CurrentUser, stepId: string) {
  const data = await getUserOnboarding(user);
  const step = data?.track.steps.find((s) => s.id === stepId);
  if (!data || !step) throw new ServiceError("Etapa não encontrada na sua trilha.");
  if (!canCompleteManually(step, data.states.get(step.id))) {
    throw new ServiceError("Esta etapa ainda não pode ser concluída. Conclua as etapas anteriores primeiro.");
  }
  await db.onboardingProgress.upsert({
    where: { userId_stepId: { userId: user.id, stepId } },
    update: {},
    create: { userId: user.id, stepId },
  });
  // Registra a conclusão automática (etapa "Conclusão") quando ela for atingida.
  const after = await getUserOnboarding(user);
  if (after) {
    const autoDone = after.track.steps.filter((s) => after.states.get(s.id) === "done" && !after.completedAt.has(s.id));
    for (const s of autoDone) {
      await db.onboardingProgress.upsert({
        where: { userId_stepId: { userId: user.id, stepId: s.id } },
        update: {},
        create: { userId: user.id, stepId: s.id },
      });
    }
    if (after.completed && !data.completed) {
      await audit({ actorId: user.id, action: "onboarding.complete", entity: "OnboardingTrack", entityId: after.track.id });
    }
  }
}

// ---------------------------------------------------------------- Administração

export async function listTracks() {
  return db.onboardingTrack.findMany({
    orderBy: [{ isDefault: "desc" }, { active: "desc" }, { name: "asc" }],
    include: { position: { select: { title: true } }, _count: { select: { steps: true } } },
  });
}

type TrackInput = { name: string; description: string | null; positionId: string | null; isDefault: boolean; active: boolean };

export async function saveTrack(actor: CurrentUser, id: string | null, input: TrackInput, withDefaultSteps = false) {
  if (input.isDefault && input.positionId) {
    throw new ServiceError("A trilha padrão vale para todos os cargos sem trilha própria; não a vincule a um cargo.", "positionId");
  }
  if (input.positionId) {
    const clash = await db.onboardingTrack.findFirst({ where: { positionId: input.positionId, NOT: id ? { id } : undefined } });
    if (clash) throw new ServiceError(`Este cargo já tem a trilha “${clash.name}”.`, "positionId");
  }
  return db.$transaction(async (tx) => {
    if (input.isDefault) await tx.onboardingTrack.updateMany({ where: { isDefault: true, NOT: id ? { id } : undefined }, data: { isDefault: false } });
    const row = id
      ? await tx.onboardingTrack.update({ where: { id }, data: input })
      : await tx.onboardingTrack.create({
          data: {
            ...input,
            steps: withDefaultSteps
              ? { create: defaultStepRows().map((r) => ({ ...r, content: r.content as Prisma.InputJsonValue | undefined })) }
              : undefined,
          },
        });
    await audit({ actorId: actor.id, action: id ? "track.update" : "track.create", entity: "OnboardingTrack", entityId: row.id }, tx);
    return row.id;
  });
}

type StepInputData = {
  type: OnboardingStepType;
  title: string;
  description: string | null;
  content: RichDoc | null;
  linkUrl: string | null;
  required: boolean;
};

export async function saveStep(actor: CurrentUser, trackId: string, id: string | null, input: StepInputData) {
  const content = input.content ? (input.content as Prisma.InputJsonValue) : Prisma.DbNull;
  await db.$transaction(async (tx) => {
    const row = id
      ? await tx.onboardingStep.update({ where: { id, trackId }, data: { ...input, content } })
      : await tx.onboardingStep.create({
          data: { ...input, content, trackId, order: (await tx.onboardingStep.count({ where: { trackId } })) + 1 },
        });
    await audit({ actorId: actor.id, action: id ? "step.update" : "step.create", entity: "OnboardingStep", entityId: row.id }, tx);
  });
}

/** Exclui a etapa (e o progresso registrado nela) e renumera as demais. */
export async function deleteStep(actor: CurrentUser, trackId: string, id: string) {
  await db.$transaction(async (tx) => {
    await tx.onboardingStep.delete({ where: { id, trackId } });
    const rest = await tx.onboardingStep.findMany({ where: { trackId }, orderBy: { order: "asc" }, select: { id: true } });
    for (const [i, st] of rest.entries()) await tx.onboardingStep.update({ where: { id: st.id }, data: { order: i + 1 } });
    await audit({ actorId: actor.id, action: "step.delete", entity: "OnboardingStep", entityId: id }, tx);
  });
}

export async function moveStep(actor: CurrentUser, trackId: string, id: string, direction: "up" | "down") {
  const steps = await db.onboardingStep.findMany({ where: { trackId }, orderBy: { order: "asc" }, select: { id: true } });
  const idx = steps.findIndex((st) => st.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= steps.length) return;
  [steps[idx], steps[swap]] = [steps[swap], steps[idx]];
  await db.$transaction(steps.map((st, i) => db.onboardingStep.update({ where: { id: st.id }, data: { order: i + 1 } })));
  await audit({ actorId: actor.id, action: "step.reorder", entity: "OnboardingStep", entityId: id });
}

/** Exclui a trilha se ninguém tiver progresso nela; caso contrário, apenas desativa. */
export async function deleteOrArchiveTrack(actor: CurrentUser, id: string): Promise<"deleted" | "archived"> {
  const used = await db.onboardingProgress.count({ where: { step: { trackId: id } } });
  if (used) {
    await db.onboardingTrack.update({ where: { id }, data: { active: false, isDefault: false } });
    await audit({ actorId: actor.id, action: "track.archive", entity: "OnboardingTrack", entityId: id });
    return "archived";
  }
  await db.onboardingTrack.delete({ where: { id } });
  await audit({ actorId: actor.id, action: "track.delete", entity: "OnboardingTrack", entityId: id });
  return "deleted";
}

/** Colaboradores ativos que seguem esta trilha e o andamento de cada um. */
export async function trackParticipants(trackId: string) {
  const track = await db.onboardingTrack.findUnique({
    where: { id: trackId },
    include: { steps: { select: { id: true, order: true, type: true, required: true } } },
  });
  if (!track || !track.active) return [];
  let where: Prisma.UserWhereInput;
  if (track.positionId) where = { positionId: track.positionId };
  else if (track.isDefault) {
    // Quem não tem cargo, ou cujo cargo não tem trilha ativa própria.
    const own = await db.onboardingTrack.findMany({ where: { active: true, positionId: { not: null } }, select: { positionId: true } });
    where = { OR: [{ positionId: null }, { positionId: { notIn: own.map((t) => t.positionId!) } }] };
  } else return [];
  const users = await db.user.findMany({
    where: { AND: [where, { status: "ACTIVE" }] },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      admissionDate: true,
      position: { select: { title: true } },
      onboarding: { where: { step: { trackId } }, select: { stepId: true, completedAt: true } },
    },
  });
  return users.map((u) => {
    const summary = computeOnboarding(track.steps, new Set(u.onboarding.map((p) => p.stepId)));
    const last = u.onboarding.reduce<Date | null>((m, p) => (!m || p.completedAt > m ? p.completedAt : m), null);
    return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, admissionDate: u.admissionDate, position: u.position?.title ?? null, percent: summary.percent, completed: summary.completed, lastActivity: last };
  });
}
