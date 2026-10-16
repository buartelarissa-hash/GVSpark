import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { asActor, makeUser, prisma, resetDb } from "./helpers";
import { completeStep, getUserOnboarding, saveTrack } from "@/server/services/onboarding";
import { deactivateOrgPosition, importOrgFromUsers, saveOrgPosition } from "@/server/services/org-chart";
import { ServiceError } from "@/server/services/users";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("trilha de integração", () => {
  async function setup() {
    const admin = await asActor((await makeUser("ADMIN")).id);
    await saveTrack(admin, null, { name: "Padrão", description: null, positionId: null, isDefault: true, active: true }, true);
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    return { admin, colab };
  }

  it("colaborador recebe a trilha padrão e conclui etapas na ordem", async () => {
    const { colab } = await setup();
    const data = (await getUserOnboarding(colab))!;
    const [welcome, history] = data.track.steps;
    await expect(completeStep(colab, history.id)).rejects.toBeInstanceOf(ServiceError);
    await completeStep(colab, welcome.id);
    await completeStep(colab, history.id);
    const after = (await getUserOnboarding(colab))!;
    expect(after.doneCount).toBe(2);
  });

  it("não permite concluir manualmente etapa de curso", async () => {
    const { colab } = await setup();
    const data = (await getUserOnboarding(colab))!;
    const course = data.track.steps.find((s) => s.type === "COURSE")!;
    await expect(completeStep(colab, course.id)).rejects.toBeInstanceOf(ServiceError);
  });

  it("registra a conclusão automática ao terminar as obrigatórias", async () => {
    const { colab } = await setup();
    const data = (await getUserOnboarding(colab))!;
    for (const s of data.track.steps.filter((s) => s.required && s.type !== "CONCLUSION")) await completeStep(colab, s.id);
    const after = (await getUserOnboarding(colab))!;
    expect(after.completed).toBe(true);
    const conclusion = after.track.steps.find((s) => s.type === "CONCLUSION")!;
    expect(await prisma.onboardingProgress.count({ where: { userId: colab.id, stepId: conclusion.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "onboarding.complete", actorId: colab.id } })).toBe(1);
  });

  it("colaborador não conclui etapa de trilha que não é a dele", async () => {
    const { admin, colab } = await setup();
    const cargo = await prisma.position.create({ data: { title: "Vendedor" } });
    const otherId = await saveTrack(admin, null, { name: "Vendas", description: null, positionId: cargo.id, isDefault: false, active: true }, true);
    const foreign = await prisma.onboardingStep.findFirstOrThrow({ where: { trackId: otherId, type: "WELCOME" } });
    await expect(completeStep(colab, foreign.id)).rejects.toBeInstanceOf(ServiceError);
  });

  it("cargo com trilha própria usa a trilha do cargo", async () => {
    const { admin } = await setup();
    const cargo = await prisma.position.create({ data: { title: "Conferente" } });
    await saveTrack(admin, null, { name: "Logística", description: null, positionId: cargo.id, isDefault: false, active: true }, false);
    const u = await prisma.user.create({ data: { name: "C", username: `c${Date.now()}`, passwordHash: "x", positionId: cargo.id } });
    expect((await getUserOnboarding(await asActor(u.id)))?.track.name).toBe("Logística");
  });

  it("só existe uma trilha padrão", async () => {
    const { admin } = await setup();
    await saveTrack(admin, null, { name: "Nova padrão", description: null, positionId: null, isDefault: true, active: true });
    expect(await prisma.onboardingTrack.count({ where: { isDefault: true } })).toBe(1);
  });
});

describe("organograma", () => {
  it("impede ciclos ao mover posições", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    await saveOrgPosition(admin, null, { title: "Diretor", responsibilities: null, parentId: null, departmentId: null, userId: null });
    const dir = await prisma.orgPosition.findFirstOrThrow({ where: { title: "Diretor" } });
    await saveOrgPosition(admin, null, { title: "Gerente", responsibilities: null, parentId: dir.id, departmentId: null, userId: null });
    const ger = await prisma.orgPosition.findFirstOrThrow({ where: { title: "Gerente" } });
    await expect(
      saveOrgPosition(admin, dir.id, { title: "Diretor", responsibilities: null, parentId: ger.id, departmentId: null, userId: null }),
    ).rejects.toMatchObject({ field: "parentId" });
  });

  it("ao desativar, os subordinados sobem um nível", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const a = await prisma.orgPosition.create({ data: { title: "A" } });
    const b = await prisma.orgPosition.create({ data: { title: "B", parentId: a.id } });
    const c = await prisma.orgPosition.create({ data: { title: "C", parentId: b.id } });
    await deactivateOrgPosition(admin, b.id);
    expect((await prisma.orgPosition.findUniqueOrThrow({ where: { id: c.id } })).parentId).toBe(a.id);
    expect((await prisma.orgPosition.findUniqueOrThrow({ where: { id: b.id } })).active).toBe(false);
  });

  it("importa a estrutura a partir dos gestores dos cadastros, sem duplicar", async () => {
    const chefe = await makeUser("ADMIN");
    const g = await makeUser("GESTOR", { managerId: chefe.id });
    await makeUser("COLABORADOR", { managerId: g.id });
    const admin = await asActor(chefe.id);
    expect(await importOrgFromUsers(admin)).toBe(3);
    const gPos = await prisma.orgPosition.findFirstOrThrow({ where: { userId: g.id } });
    const chefePos = await prisma.orgPosition.findFirstOrThrow({ where: { userId: chefe.id } });
    expect(gPos.parentId).toBe(chefePos.id);
    expect(await importOrgFromUsers(admin)).toBe(0);
  });

  it("não aceita ocupante inativo", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const inativo = await prisma.user.create({ data: { name: "X", username: `x${Date.now()}`, passwordHash: "x", status: "INACTIVE" } });
    await expect(
      saveOrgPosition(admin, null, { title: "P", responsibilities: null, parentId: null, departmentId: null, userId: inativo.id }),
    ).rejects.toMatchObject({ field: "userId" });
  });
});
