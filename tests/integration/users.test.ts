import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { asActor, makeUser, prisma, resetDb } from "./helpers";
import {
  createUser,
  resetUserPassword,
  getUserForActor,
  listUsers,
  ServiceError,
  setUserStatus,
  updateUser,
} from "@/server/services/users";
import { verifyPassword } from "@/server/auth/password";
import type { UserFormInput } from "@/lib/validation";

const baseInput = (over: Partial<UserFormInput> = {}): UserFormInput => ({
  name: "Nova Pessoa",
  username: `nova.${Math.random().toString(36).slice(2, 10)}`,
  email: null,
  role: "COLABORADOR",
  registration: null,
  phone: null,
  admissionDate: "2026-01-05",
  departmentId: null,
  positionId: null,
  managerId: null,
  ...over,
});

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("isolamento de dados por perfil (backend)", () => {
  it("colaborador só encontra o próprio cadastro, mesmo consultando outro id diretamente", async () => {
    const colab = await makeUser("COLABORADOR");
    const outro = await makeUser("COLABORADOR");
    const actor = await asActor(colab.id);
    expect(await getUserForActor(actor, outro.id)).toBeNull();
    expect((await getUserForActor(actor, colab.id))?.id).toBe(colab.id);
    const list = await listUsers(actor, {});
    expect(list.items.map((u) => u.id)).toEqual([colab.id]);
  });

  it("gestor vê subordinados e membros do departamento que chefia, e nada além", async () => {
    const dep = await prisma.department.create({ data: { name: "Comercial" } });
    const outroDep = await prisma.department.create({ data: { name: "Logística" } });
    const gestor = await makeUser("GESTOR");
    await prisma.department.update({ where: { id: dep.id }, data: { headId: gestor.id } });
    const direto = await makeUser("COLABORADOR", { managerId: gestor.id });
    const doDepartamento = await makeUser("COLABORADOR", { departmentId: dep.id });
    const deFora = await makeUser("COLABORADOR", { departmentId: outroDep.id });

    const actor = await asActor(gestor.id);
    const ids = (await listUsers(actor, {})).items.map((u) => u.id).sort();
    expect(ids).toEqual([gestor.id, direto.id, doDepartamento.id].sort());
    expect(await getUserForActor(actor, deFora.id)).toBeNull();
  });

  it("administrador vê todos", async () => {
    const admin = await makeUser("ADMIN");
    await makeUser("COLABORADOR");
    await makeUser("GESTOR");
    const list = await listUsers(await asActor(admin.id), {});
    expect(list.total).toBe(3);
  });
});

describe("cadastro de colaboradores", () => {
  it("cria com senha temporária válida, troca obrigatória e registro de auditoria", async () => {
    const admin = await makeUser("ADMIN");
    const input = baseInput();
    const { id, temporaryPassword } = await createUser(await asActor(admin.id), input);
    const created = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(created.mustChangePassword).toBe(true);
    expect(created.admissionDate?.toISOString().slice(0, 10)).toBe("2026-01-05");
    expect(await verifyPassword(temporaryPassword, created.passwordHash)).toBe(true);
    const log = await prisma.auditLog.findFirst({ where: { action: "user.create", entityId: id } });
    expect(log?.actorId).toBe(admin.id);
  });

  it("recusa nome de usuário duplicado com mensagem no campo", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const input = baseInput();
    await createUser(admin, input);
    await expect(createUser(admin, { ...input, name: "Outra" })).rejects.toMatchObject({
      name: "ServiceError",
      field: "username",
    });
  });

  it("permite cadastrar sem e-mail", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const { id } = await createUser(admin, baseInput({ email: null }));
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).email).toBeNull();
  });

  it("recusa cargo de outro departamento", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const a = await prisma.department.create({ data: { name: "A" } });
    const b = await prisma.department.create({ data: { name: "B" } });
    const cargo = await prisma.position.create({ data: { title: "Cargo de B", departmentId: b.id } });
    await expect(createUser(admin, baseInput({ departmentId: a.id, positionId: cargo.id }))).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("impede ciclo na cadeia de gestão", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const chefe = await makeUser("GESTOR");
    const sub = await makeUser("COLABORADOR", { managerId: chefe.id });
    await expect(
      updateUser(admin, chefe.id, baseInput({ username: chefe.username, role: "GESTOR", managerId: sub.id })),
    ).rejects.toMatchObject({ field: "managerId" });
  });

  it("administrador não pode remover o próprio perfil nem se desativar", async () => {
    const admin = await makeUser("ADMIN");
    const actor = await asActor(admin.id);
    await expect(updateUser(actor, admin.id, baseInput({ username: admin.username, role: "COLABORADOR" }))).rejects.toBeInstanceOf(
      ServiceError,
    );
    await expect(setUserStatus(actor, admin.id, "INACTIVE")).rejects.toBeInstanceOf(ServiceError);
  });

  it("desativar encerra as sessões e preserva o cadastro", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const colab = await makeUser("COLABORADOR");
    await prisma.session.create({
      data: { tokenHash: "hash-teste", userId: colab.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    await setUserStatus(admin, colab.id, "INACTIVE");
    expect(await prisma.session.count({ where: { userId: colab.id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: colab.id } })).status).toBe("INACTIVE");
  });

  it("mudança de papel encerra as sessões ativas", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const colab = await makeUser("COLABORADOR");
    await prisma.session.create({
      data: { tokenHash: "hash-papel", userId: colab.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    await updateUser(admin, colab.id, baseInput({ username: colab.username, role: "GESTOR" }));
    expect(await prisma.session.count({ where: { userId: colab.id } })).toBe(0);
  });
});

describe("edição pelo gestor", () => {
  async function setup() {
    const dep = await prisma.department.create({ data: { name: "Comercial" } });
    const gestor = await makeUser("GESTOR");
    await prisma.department.update({ where: { id: dep.id }, data: { headId: gestor.id } });
    const membro = await makeUser("COLABORADOR", { managerId: gestor.id });
    const deFora = await makeUser("COLABORADOR");
    const adminNaEquipe = await makeUser("ADMIN", { departmentId: dep.id });
    return { gestor: await asActor(gestor.id), membro, deFora, adminNaEquipe };
  }

  it("edita os dados de um membro da equipe", async () => {
    const { gestor, membro } = await setup();
    await updateUser(gestor, membro.id, baseInput({ name: "Nome Editado", username: membro.username, phone: "1234" }));
    const after = await prisma.user.findUniqueOrThrow({ where: { id: membro.id } });
    expect(after.name).toBe("Nome Editado");
    expect(after.phone).toBe("1234");
  });

  it("não altera o perfil de acesso, mesmo enviando outro perfil", async () => {
    const { gestor, membro } = await setup();
    await updateUser(gestor, membro.id, baseInput({ username: membro.username, role: "ADMIN" }));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: membro.id } })).role).toBe("COLABORADOR");
  });

  it("não edita pessoas fora da equipe nem administradores", async () => {
    const { gestor, deFora, adminNaEquipe } = await setup();
    await expect(updateUser(gestor, deFora.id, baseInput({ username: deFora.username }))).rejects.toBeInstanceOf(ServiceError);
    await expect(
      updateUser(gestor, adminNaEquipe.id, baseInput({ username: adminNaEquipe.username, role: "ADMIN" })),
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(resetUserPassword(gestor, deFora.id)).rejects.toBeInstanceOf(ServiceError);
  });

  it("gera senha temporária para membro da equipe", async () => {
    const { gestor, membro } = await setup();
    const pwd = await resetUserPassword(gestor, membro.id);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: membro.id } });
    expect(after.mustChangePassword).toBe(true);
    expect(await verifyPassword(pwd, after.passwordHash)).toBe(true);
  });
});
