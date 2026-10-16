import { notFound } from "next/navigation";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { getCourseForEdit } from "@/server/services/courses";
import { StructureEditor } from "./structure-editor";

export const metadata = { title: "Estrutura do curso" };

export default async function CourseStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const { id } = await params;
  const course = await getCourseForEdit(actor, id);
  if (!course) notFound();
  return (
    <StructureEditor
      courseId={course.id}
      initial={course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, published: l.published, blocks: l._count.blocks, minutes: l.estimatedMinutes })),
      }))}
    />
  );
}
