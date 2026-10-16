import { PrismaClient, type Role } from "@prisma/client";
import type { CurrentUser } from "@/server/auth/current-user";

export const prisma = new PrismaClient();

export async function resetDb() {
  // Ordem respeita as chaves estrangeiras usadas nestes testes.
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.department.updateMany({ data: { headId: null, parentId: null } });
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
}

let seq = 0;
export async function makeUser(role: Role, extra: Partial<{ managerId: string; departmentId: string }> = {}) {
  seq++;
  return prisma.user.create({
    data: { name: `Pessoa ${seq}`, email: `p${seq}-${Date.now()}@teste.dev`, passwordHash: "x", role, ...extra },
  });
}

/** Constrói o mesmo formato de usuário que getCurrentUser() retorna. */
export async function asActor(id: string): Promise<CurrentUser> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
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
    },
  });
  return { ...u, headedDepartmentIds: u.headOfDepartment.map((d) => d.id) };
}
