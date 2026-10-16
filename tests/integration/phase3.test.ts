import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { asActor, makeUser, prisma, resetDb } from "./helpers";
import { canManageCourse, canViewCourseById } from "@/server/services/academy-access";
import {
  addLesson,
  addModule,
  deleteLesson,
  reorderCourseStructure,
  saveBlock,
  saveCourse,
  updateLessonMeta,
  type CourseInput,
} from "@/server/services/courses";
import { catalogForUser, completeLesson, getCourseView } from "@/server/services/learning";
import { addAssignment, saveLearningPath } from "@/server/services/assignments";
import { createUser } from "@/server/services/users";
import { getUserOnboarding, saveTrack } from "@/server/services/onboarding";
import { finalizeUpload, receiveLocalUpload, startUpload } from "@/server/services/uploads";
import { ServiceError } from "@/server/services/errors";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const baseCourse = (over: Partial<CourseInput> = {}): CourseInput => ({
  title: "Curso Teste",
  description: null,
  categoryId: null,
  brandId: null,
  instructorId: null,
  targetAudience: null,
  durationMinutes: null,
  workloadHours: null,
  level: "BASIC",
  mandatory: false,
  restricted: false,
  publishAt: null,
  dueDays: null,
  status: "DRAFT",
  ...over,
});

const textBlock = { doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Conteúdo" }] }] } };

/** Curso publicado com 1 módulo e `n` aulas publicadas. */
async function publishedCourse(n = 2, over: Partial<CourseInput> = {}) {
  const admin = await asActor((await makeUser("ADMIN")).id);
  const courseId = await saveCourse(admin, null, baseCourse(over), new FormData());
  await addModule(admin, courseId, "Módulo 1", null);
  const mod = await prisma.courseModule.findFirstOrThrow({ where: { courseId } });
  const lessons: string[] = [];
  for (let i = 0; i < n; i++) {
    const l = await addLesson(admin, mod.id, `Aula ${i + 1}`);
    await saveBlock(admin, l, null, "RICH_TEXT", textBlock);
    await updateLessonMeta(admin, l, { title: `Aula ${i + 1}`, description: null, estimatedMinutes: null, published: true });
    lessons.push(l);
  }
  await saveCourse(admin, courseId, baseCourse({ ...over, status: "PUBLISHED" }), new FormData());
  return { admin, courseId, moduleId: mod.id, lessons };
}

describe("permissões de cursos", () => {
  it("instrutor gerencia apenas os próprios cursos e é sempre o responsável", async () => {
    const instr = await asActor((await makeUser("INSTRUTOR")).id);
    const outro = await makeUser("INSTRUTOR");
    const id = await saveCourse(instr, null, baseCourse({ instructorId: outro.id }), new FormData());
    const course = await prisma.course.findUniqueOrThrow({ where: { id } });
    expect(course.instructorId).toBe(instr.id);
    expect(canManageCourse(instr, course)).toBe(true);
    expect(canManageCourse(await asActor(outro.id), course)).toBe(false);
    await expect(addModule(await asActor(outro.id), id, "M", null)).rejects.toBeInstanceOf(ServiceError);
  });

  it("colaborador não cria nem edita cursos", async () => {
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    await expect(saveCourse(colab, null, baseCourse(), new FormData())).rejects.toBeInstanceOf(ServiceError);
  });

  it("não publica curso sem aulas publicadas", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const id = await saveCourse(admin, null, baseCourse(), new FormData());
    await expect(saveCourse(admin, id, baseCourse({ status: "PUBLISHED" }), new FormData())).rejects.toMatchObject({ field: "status" });
  });

  it("não publica aula vazia", async () => {
    const admin = await asActor((await makeUser("ADMIN")).id);
    const id = await saveCourse(admin, null, baseCourse(), new FormData());
    await addModule(admin, id, "M", null);
    const mod = await prisma.courseModule.findFirstOrThrow({ where: { courseId: id } });
    const l = await addLesson(admin, mod.id, "Vazia");
    await expect(updateLessonMeta(admin, l, { title: "Vazia", description: null, estimatedMinutes: null, published: true })).rejects.toMatchObject({ field: "published" });
  });
});

describe("visibilidade para o colaborador", () => {
  it("rascunho e curso agendado não aparecem; publicado aparece", async () => {
    const { courseId } = await publishedCourse(1);
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    expect(await canViewCourseById(colab, courseId)).toBe(true);
    await prisma.course.update({ where: { id: courseId }, data: { publishAt: new Date(Date.now() + 86_400_000) } });
    expect(await canViewCourseById(colab, courseId)).toBe(false);
    await prisma.course.update({ where: { id: courseId }, data: { publishAt: null, status: "DRAFT" } });
    expect(await canViewCourseById(colab, courseId)).toBe(false);
    expect((await catalogForUser(colab, {})).length).toBe(0);
  });

  it("curso restrito só aparece para quem foi atribuído", async () => {
    const { admin, courseId } = await publishedCourse(1, { restricted: true });
    const a = await asActor((await makeUser("COLABORADOR")).id);
    const b = await asActor((await makeUser("COLABORADOR")).id);
    await addAssignment(admin, courseId, { targetType: "USER", departmentId: null, positionId: null, userIds: [a.id], dueDate: null, mandatory: true });
    expect(await canViewCourseById(a, courseId)).toBe(true);
    expect(await canViewCourseById(b, courseId)).toBe(false);
    expect((await catalogForUser(b, {})).length).toBe(0);
  });

  it("aulas em rascunho não aparecem para o colaborador", async () => {
    const { admin, courseId, moduleId } = await publishedCourse(1);
    await addLesson(admin, moduleId, "Rascunho");
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    const slug = (await prisma.course.findUniqueOrThrow({ where: { id: courseId } })).slug;
    const view = await getCourseView(colab, slug);
    expect(view?.course.modules[0].lessons.map((l) => l.title)).toEqual(["Aula 1"]);
  });
});

describe("progresso e conclusão", () => {
  it("conclui o curso quando todas as aulas publicadas são concluídas", async () => {
    const { courseId, lessons } = await publishedCourse(2);
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    expect(await completeLesson(colab, lessons[0])).toBe(false);
    let e = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: colab.id, courseId } } });
    expect(e.status).toBe("IN_PROGRESS");
    expect(await completeLesson(colab, lessons[1])).toBe(true);
    e = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: colab.id, courseId } } });
    expect(e.status).toBe("COMPLETED");
    expect(e.completedAt).not.toBeNull();
  });

  it("não conclui aula de curso que a pessoa não pode ver", async () => {
    const { lessons } = await publishedCourse(1, { restricted: true });
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    await expect(completeLesson(colab, lessons[0])).rejects.toBeInstanceOf(ServiceError);
  });

  it("conclusão do curso conclui a etapa de treinamento da integração", async () => {
    const { admin, courseId, lessons } = await publishedCourse(1);
    const trackId = await saveTrack(admin, null, { name: "Padrão", description: null, positionId: null, isDefault: true, active: true }, true);
    await prisma.onboardingStep.updateMany({ where: { trackId, type: "COURSE" }, data: { refId: courseId } });
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    await completeLesson(colab, lessons[0]);
    const data = (await getUserOnboarding(colab))!;
    const step = data.track.steps.find((s) => s.type === "COURSE")!;
    expect(data.states.get(step.id)).toBe("done");
  });

  it("não exclui aula já estudada", async () => {
    const { admin, lessons } = await publishedCourse(1);
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    await completeLesson(colab, lessons[0]);
    await expect(deleteLesson(admin, lessons[0])).rejects.toBeInstanceOf(ServiceError);
  });
});

describe("estrutura do curso", () => {
  it("move aulas entre módulos e recusa estrutura incompleta", async () => {
    const { admin, courseId, moduleId, lessons } = await publishedCourse(2);
    await addModule(admin, courseId, "Módulo 2", null);
    const m2 = await prisma.courseModule.findFirstOrThrow({ where: { courseId, title: "Módulo 2" } });
    await reorderCourseStructure(admin, courseId, [
      { moduleId: m2.id, lessonIds: [lessons[1]] },
      { moduleId, lessonIds: [lessons[0]] },
    ]);
    const moved = await prisma.lesson.findUniqueOrThrow({ where: { id: lessons[1] } });
    expect(moved.moduleId).toBe(m2.id);
    expect((await prisma.courseModule.findUniqueOrThrow({ where: { id: m2.id } })).order).toBe(1);
    await expect(reorderCourseStructure(admin, courseId, [{ moduleId, lessonIds: [lessons[0]] }])).rejects.toBeInstanceOf(ServiceError);
  });
});

describe("atribuições e trilhas", () => {
  it("atribuição por departamento matricula atuais e futuros membros", async () => {
    const { admin, courseId } = await publishedCourse(1);
    const dep = await prisma.department.create({ data: { name: "Comercial" } });
    const atual = await makeUser("COLABORADOR", { departmentId: dep.id });
    await addAssignment(admin, courseId, { targetType: "DEPARTMENT", departmentId: dep.id, positionId: null, userIds: [], dueDate: null, mandatory: true });
    expect(await prisma.enrollment.count({ where: { courseId, userId: atual.id, mandatory: true } })).toBe(1);
    const { id: novo } = await createUser(admin, {
      name: "Novo Vendedor",
      username: `novo.${Date.now()}`,
      email: null,
      role: "COLABORADOR",
      registration: null,
      phone: null,
      admissionDate: null,
      departmentId: dep.id,
      positionId: null,
      managerId: null,
    });
    expect(await prisma.enrollment.count({ where: { courseId, userId: novo } })).toBe(1);
  });

  it("trilha automática por cargo atribui os cursos a quem é cadastrado no cargo", async () => {
    const { admin, courseId } = await publishedCourse(1);
    const cargo = await prisma.position.create({ data: { title: "Vendedor interno" } });
    await saveLearningPath(admin, null, { name: "Formação", description: null, positionId: cargo.id, autoAssign: true, courseIds: [courseId] });
    const { id } = await createUser(admin, {
      name: "Vendedor",
      username: `vend.${Date.now()}`,
      email: null,
      role: "COLABORADOR",
      registration: null,
      phone: null,
      admissionDate: null,
      departmentId: null,
      positionId: cargo.id,
      managerId: null,
    });
    const e = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: id, courseId } } });
    expect(e.source).toBe("path");
    expect(e.mandatory).toBe(true);
  });
});

describe("upload de arquivos", () => {
  async function upload(actorId: string, courseId: string, name: string, content: Uint8Array) {
    const actor = await asActor(actorId);
    const ticket = await startUpload(actor, { fileName: name, size: content.length, target: { type: "course", courseId } });
    const token = ticket.url.split("/").pop()!;
    await receiveLocalUpload(actor.id, token, new Blob([content as unknown as BlobPart]).stream());
    return finalizeUpload(actor, ticket.fileId);
  }

  it("aceita PDF real e o vincula ao curso", async () => {
    const { admin, courseId } = await publishedCourse(1);
    const pdf = new TextEncoder().encode("%PDF-1.4\n%conteudo de teste\n");
    const f = await upload(admin.id, courseId, "manual.pdf", pdf);
    expect(f.status).toBe("READY");
    expect(f.courseId).toBe(courseId);
  });

  it("recusa e apaga arquivo disfarçado", async () => {
    const { admin, courseId } = await publishedCourse(1);
    const fake = new TextEncoder().encode("<script>alert(1)</script>");
    await expect(upload(admin.id, courseId, "manual.pdf", fake)).rejects.toBeInstanceOf(ServiceError);
    expect(await prisma.fileAsset.count()).toBe(0);
  });

  it("colaborador não envia arquivos para cursos", async () => {
    const { courseId } = await publishedCourse(1);
    const colab = await asActor((await makeUser("COLABORADOR")).id);
    await expect(startUpload(colab, { fileName: "a.pdf", size: 10, target: { type: "course", courseId } })).rejects.toBeInstanceOf(ServiceError);
  });

  it("recusa corpo maior que o tamanho declarado", async () => {
    const { admin, courseId } = await publishedCourse(1);
    const ticket = await startUpload(admin, { fileName: "a.pdf", size: 5, target: { type: "course", courseId } });
    await expect(receiveLocalUpload(admin.id, ticket.url.split("/").pop()!, new Blob([new Uint8Array(50)]).stream())).rejects.toThrow();
  });
});
