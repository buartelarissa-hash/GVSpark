import { notFound } from "next/navigation";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { getCourseForEdit } from "@/server/services/courses";
import { courseFormOptions } from "@/server/services/course-options";
import { hasPermission } from "@/server/permissions/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInput } from "@/lib/format";
import { CourseForm } from "../../course-form";

export const metadata = { title: "Dados do curso" };

export default async function CourseDataPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const { id } = await params;
  const course = await getCourseForEdit(actor, id);
  if (!course) notFound();
  const options = await courseFormOptions();
  return (
    <Card>
      <CardContent className="p-6">
        <CourseForm
          {...options}
          canChooseInstructor={hasPermission(actor.role, "courses.manage")}
          course={{
            id: course.id,
            title: course.title,
            description: course.description,
            coverUrl: course.coverUrl,
            categoryId: course.categoryId,
            brandId: course.brandId,
            instructorId: course.instructorId,
            targetAudience: course.targetAudience,
            durationMinutes: course.durationMinutes,
            workloadHours: course.workloadHours?.toString().replace(".", ",") ?? null,
            level: course.level,
            mandatory: course.mandatory,
            restricted: course.restricted,
            publishAt: toDateInput(course.publishAt),
            dueDays: course.dueDays,
            status: course.status,
          }}
        />
      </CardContent>
    </Card>
  );
}
