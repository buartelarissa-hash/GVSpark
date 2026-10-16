/**
 * Seed de DESENVOLVIMENTO do GV SPARK.
 *
 * Todos os registros criados aqui têm `isDemo = true` e aparecem na interface com
 * o selo "Demonstrativo". Nenhum dado histórico real da Gigavale é inventado.
 * Não execute em produção (bloqueado, salvo SEED_ALLOW_PRODUCTION=1).
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "Spark@2026";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
    throw new Error("Seed demonstrativo bloqueado em produção.");
  }

  const departments = [
    { name: "Diretoria", description: "Departamento demonstrativo." },
    { name: "Comercial", description: "Departamento demonstrativo." },
    { name: "Logística", description: "Departamento demonstrativo." },
    { name: "Recursos Humanos", description: "Departamento demonstrativo." },
  ];
  const dep: Record<string, string> = {};
  for (const d of departments) {
    const row = await db.department.upsert({
      where: { name: d.name },
      update: {},
      create: { ...d, isDemo: true },
    });
    dep[d.name] = row.id;
  }

  const positions = [
    { title: "Diretor(a)", department: "Diretoria" },
    { title: "Gerente comercial", department: "Comercial" },
    { title: "Vendedor(a) interno(a)", department: "Comercial" },
    { title: "Vendedor(a) externo(a)", department: "Comercial" },
    { title: "Analista de treinamento", department: "Recursos Humanos" },
    { title: "Conferente", department: "Logística" },
  ];
  const pos: Record<string, string> = {};
  for (const p of positions) {
    const departmentId = dep[p.department];
    const existing = await db.position.findFirst({ where: { title: p.title, departmentId } });
    const row = existing ?? (await db.position.create({ data: { title: p.title, departmentId, isDemo: true } }));
    pos[p.title] = row.id;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users: {
    key: string;
    name: string;
    email: string;
    role: Role;
    position: string;
    department: string;
    admission: string;
    manager?: string;
  }[] = [
    { key: "admin", name: "Administrador Demonstrativo", email: "admin@gvspark.dev", role: "ADMIN", position: "Diretor(a)", department: "Diretoria", admission: "2019-03-11" },
    { key: "gestor", name: "Gestora Demonstrativa", email: "gestor@gvspark.dev", role: "GESTOR", position: "Gerente comercial", department: "Comercial", admission: "2021-06-01", manager: "admin" },
    { key: "instrutor", name: "Instrutor Demonstrativo", email: "instrutor@gvspark.dev", role: "INSTRUTOR", position: "Analista de treinamento", department: "Recursos Humanos", admission: "2022-02-14", manager: "admin" },
    { key: "colaborador", name: "João Demonstrativo", email: "colaborador@gvspark.dev", role: "COLABORADOR", position: "Vendedor(a) interno(a)", department: "Comercial", admission: "2025-08-04", manager: "gestor" },
    { key: "colaborador2", name: "Maria Demonstrativa", email: "colaborador2@gvspark.dev", role: "COLABORADOR", position: "Conferente", department: "Logística", admission: "2024-01-15", manager: "admin" },
  ];
  const ids: Record<string, string> = {};
  for (const u of users) {
    const row = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        positionId: pos[u.position],
        departmentId: dep[u.department],
        admissionDate: new Date(`${u.admission}T00:00:00Z`),
        managerId: u.manager ? ids[u.manager] : null,
        isDemo: true,
      },
    });
    ids[u.key] = row.id;
  }

  await db.department.update({ where: { id: dep["Comercial"] }, data: { headId: ids.gestor } });
  await db.department.update({ where: { id: dep["Diretoria"] }, data: { headId: ids.admin } });

  if ((await db.announcement.count({ where: { isDemo: true } })) === 0) {
    await db.announcement.create({
      data: {
        title: "Comunicado demonstrativo",
        body: "Este é um comunicado de exemplo do ambiente de desenvolvimento. Os comunicados oficiais serão publicados pelo administrador.",
        publishedAt: new Date(),
        pinned: true,
        isDemo: true,
        authorId: ids.admin,
      },
    });
  }

  console.log("Seed demonstrativo concluído.");
  console.log(`Usuários (senha ${DEMO_PASSWORD}):`);
  for (const u of users) console.log(`  ${u.role.padEnd(12)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
