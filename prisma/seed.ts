/**
 * Seed de DESENVOLVIMENTO do GV SPARK.
 *
 * Todos os registros criados aqui têm `isDemo = true` e aparecem na interface com
 * o selo "Demonstrativo". Nenhum dado histórico real da Gigavale é inventado.
 * Não execute em produção (bloqueado, salvo SEED_ALLOW_PRODUCTION=1).
 */
import { PrismaClient, type CompanySectionType, type Prisma, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultStepRows } from "../src/lib/onboarding";
import { textToRichDoc } from "../src/lib/rich-text";

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
    username: string;
    role: Role;
    position: string;
    department: string;
    admission: string;
    manager?: string;
  }[] = [
    { key: "admin", name: "Administrador Demonstrativo", username: "admin", role: "ADMIN", position: "Diretor(a)", department: "Diretoria", admission: "2019-03-11" },
    { key: "gestor", name: "Gestora Demonstrativa", username: "gestor", role: "GESTOR", position: "Gerente comercial", department: "Comercial", admission: "2021-06-01", manager: "admin" },
    { key: "instrutor", name: "Instrutor Demonstrativo", username: "instrutor", role: "INSTRUTOR", position: "Analista de treinamento", department: "Recursos Humanos", admission: "2022-02-14", manager: "admin" },
    { key: "colaborador", name: "João Demonstrativo", username: "colaborador", role: "COLABORADOR", position: "Vendedor(a) interno(a)", department: "Comercial", admission: "2025-08-04", manager: "gestor" },
    { key: "colaborador2", name: "Maria Demonstrativa", username: "colaborador2", role: "COLABORADOR", position: "Conferente", department: "Logística", admission: "2024-01-15", manager: "admin" },
  ];
  const ids: Record<string, string> = {};
  for (const u of users) {
    const row = await db.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        name: u.name,
        username: u.username,
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

  // ---------------------------------------------------------------- Fase 2

  // Trilha padrão de integração (estrutura sugerida, não é dado histórico).
  if ((await db.onboardingTrack.count()) === 0) {
    await db.onboardingTrack.create({
      data: {
        name: "Integração Gigavale",
        description: "Sua jornada de boas-vindas. Siga as etapas na ordem; os materiais continuam disponíveis no menu.",
        isDefault: true,
        steps: {
          create: defaultStepRows().map((r) => ({ ...r, content: r.content as Prisma.InputJsonValue | undefined })),
        },
      },
    });
  }

  // Conteúdo institucional DEMONSTRATIVO — nenhum fato histórico real é inventado.
  if ((await db.companySection.count()) === 0) {
    const demo = (type: CompanySectionType, title: string, text: string, order = 1) => ({
      type,
      title,
      order,
      published: true,
      isDemo: true,
      body: textToRichDoc(text) as Prisma.InputJsonValue,
    });
    const aviso = "Conteúdo demonstrativo. Substitua pelo texto oficial em Portal ADM › História e cultura.";
    await db.companySection.createMany({
      data: [
        demo("HISTORY", "Como tudo começou", `${aviso}\n\nUse esta seção para contar a origem da Gigavale Atacado, quem fundou a empresa e o contexto da época.`),
        demo("HISTORY", "Crescimento", `${aviso}\n\nDescreva aqui as principais fases de crescimento, novas unidades e conquistas.`, 2),
        demo("MISSION", "Missão", `${aviso}\n\nA missão oficial da empresa será exibida aqui.`),
        demo("VISION", "Visão", `${aviso}\n\nA visão oficial da empresa será exibida aqui.`),
        demo("PURPOSE", "Propósito", `${aviso}\n\nO propósito oficial da empresa será exibido aqui.`),
        demo("VALUES", "Nossos valores", `${aviso}\n\nListe aqui os valores oficiais da Gigavale.`),
        demo("CULTURE", "Nosso jeito de trabalhar", `${aviso}\n\nApresente rituais, comportamentos esperados e o que torna a cultura da Gigavale única.`),
      ],
    });
  }
  if ((await db.timelineEvent.count()) === 0) {
    await db.timelineEvent.createMany({
      data: [
        { date: new Date("2000-01-01T00:00:00Z"), title: "Exemplo de marco: fundação", description: "Marco demonstrativo. Cadastre as datas reais em Portal ADM › História e cultura › Linha do tempo.", highlight: true, published: true, isDemo: true },
        { date: new Date("2015-01-01T00:00:00Z"), title: "Exemplo de marco: expansão", description: "Marco demonstrativo.", published: true, isDemo: true },
        { date: new Date("2026-01-01T00:00:00Z"), title: "Exemplo de marco: lançamento do GV SPARK", description: "Marco demonstrativo.", published: true, isDemo: true },
      ],
    });
  }

  // Organograma demonstrativo a partir dos usuários demonstrativos.
  if ((await db.orgPosition.count()) === 0) {
    const pos = (title: string, userId: string | null, departmentId: string | null, parentId: string | null, order: number, responsibilities?: string) =>
      db.orgPosition.create({ data: { title, userId, departmentId, parentId, order, responsibilities, isDemo: true } });
    const dir = await pos("Diretoria", ids.admin, dep["Diretoria"], null, 1, "Responsabilidades demonstrativas: direção geral da empresa.");
    const com = await pos("Gerente comercial", ids.gestor, dep["Comercial"], dir.id, 1, "Responsabilidades demonstrativas: liderar a equipe de vendas.");
    await pos("Vendedor(a) interno(a)", ids.colaborador, dep["Comercial"], com.id, 1, "Responsabilidades demonstrativas: atendimento e vendas internas.");
    await pos("Vendedor(a) externo(a)", null, dep["Comercial"], com.id, 2, "Posição vaga demonstrativa.");
    await pos("Analista de treinamento", ids.instrutor, dep["Recursos Humanos"], dir.id, 2, "Responsabilidades demonstrativas: treinamentos e integração.");
    const log = await pos("Supervisor(a) de logística", null, dep["Logística"], dir.id, 3, "Posição vaga demonstrativa.");
    await pos("Conferente", ids.colaborador2, dep["Logística"], log.id, 1, "Responsabilidades demonstrativas: conferência de mercadorias.");
  }

  // ---------------------------------------------------------------- Fase 3 — Academy

  // Categorias e marcas indicadas no briefing (sem conteúdo inventado).
  const categories: [string, string, string][] = [
    ["Adesivos e selantes", "adesivos-e-selantes", "droplets"],
    ["Elétrica", "eletrica", "zap"],
    ["Hidráulica", "hidraulica", "shower"],
    ["Tintas", "tintas", "paint"],
    ["Ferramentas", "ferramentas", "hammer"],
    ["Abrasivos", "abrasivos", "disc"],
    ["Acessórios para construção", "acessorios-para-construcao", "package"],
  ];
  for (const [i, [name, slug, icon]] of categories.entries()) {
    await db.courseCategory.upsert({ where: { slug }, update: {}, create: { name, slug, icon, order: i + 1 } });
  }
  for (const name of ["Tekbond", "Norton", "Pluzie", "Novatintas", "Compel", "Infibra"]) {
    const slug = name.toLowerCase();
    await db.brand.upsert({ where: { slug }, update: {}, create: { name, slug, isDemo: true } });
  }

  // Curso demonstrativo (estrutura do exemplo do briefing; textos marcados como demonstrativos).
  if (!(await db.course.findUnique({ where: { slug: "especialista-em-adesivos" } }))) {
    const cat = await db.courseCategory.findUniqueOrThrow({ where: { slug: "adesivos-e-selantes" } });
    const text = (t: string) => ({ doc: textToRichDoc(`Conteúdo demonstrativo. ${t}`) }) as unknown as Prisma.InputJsonValue;
    const modules: [string, string[]][] = [
      ["Conhecendo a marca", ["Apresentação do curso", "Histórico e posicionamento"]],
      ["Características dos produtos", ["Tipos de adesivos", "Selantes e suas aplicações"]],
      ["Aplicações práticas", ["Preparação de superfícies", "Erros comuns na aplicação"]],
      ["Técnicas de venda", ["Entendendo a necessidade do cliente", "Argumentos de venda"]],
      ["Avaliação final", ["Revisão do conteúdo"]],
    ];
    const course = await db.course.create({
      data: {
        title: "Especialista em Adesivos",
        slug: "especialista-em-adesivos",
        description: "Curso demonstrativo do GV SPARK. Substitua pelo conteúdo oficial ou crie novos cursos no Portal ADM.",
        categoryId: cat.id,
        instructorId: ids.instrutor,
        createdById: ids.admin,
        targetAudience: "Vendedores internos e externos",
        durationMinutes: 90,
        workloadHours: 2,
        level: "BASIC",
        mandatory: true,
        status: "PUBLISHED",
        publishAt: new Date(),
        dueDays: 30,
        isDemo: true,
        modules: {
          create: modules.map(([title, lessons], i) => ({
            title,
            order: i + 1,
            lessons: {
              create: lessons.map((lt, j) => ({
                title: lt,
                order: j + 1,
                published: true,
                estimatedMinutes: 10,
                blocks: {
                  create: [
                    { order: 1, type: "RICH_TEXT" as const, content: text(`Esta aula ("${lt}") mostra como os blocos de conteúdo aparecem para o colaborador. Edite-a no Portal ADM › Editor de aulas.`) },
                    ...(j === 0 && i === 0
                      ? [{ order: 2, type: "ACTIVITY" as const, content: { title: "Atividade de exemplo", instructions: textToRichDoc("Conteúdo demonstrativo. Liste três produtos da categoria que você já vendeu e para quais aplicações.") } as unknown as Prisma.InputJsonValue }]
                      : []),
                  ],
                },
              })),
            },
          })),
        },
      },
    });
    // Atribuído ao Comercial (obrigatório) para demonstrar atribuições e prazos.
    await db.courseAssignment.create({
      data: { courseId: course.id, targetType: "DEPARTMENT", departmentId: dep["Comercial"], mandatory: true, assignedById: ids.admin },
    });
    const comercial = await db.user.findMany({ where: { departmentId: dep["Comercial"], status: "ACTIVE" }, select: { id: true } });
    await db.enrollment.createMany({
      data: comercial.map((u) => ({ userId: u.id, courseId: course.id, source: "assignment", mandatory: true, dueDate: new Date(Date.now() + 30 * 86_400_000) })),
      skipDuplicates: true,
    });
    // Etapa de treinamento da integração passa a usar este curso.
    await db.onboardingStep.updateMany({ where: { type: "COURSE", refId: null }, data: { refId: course.id } });
  }

  console.log("Seed demonstrativo concluído.");
  console.log(`Usuários (senha ${DEMO_PASSWORD}):`);
  for (const u of users) console.log(`  ${u.role.padEnd(12)} ${u.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
