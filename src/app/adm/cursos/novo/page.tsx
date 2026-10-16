import { requireAnyPagePermission } from "@/server/auth/current-user";
import { courseFormOptions } from "@/server/services/course-options";
import { hasPermission } from "@/server/permissions/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CourseForm } from "../course-form";

export const metadata = { title: "Novo curso" };

export default async function NewCoursePage() {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const options = await courseFormOptions();
  return (
    <>
      <PageHeader title="Novo curso" description="Depois de criar, você monta os módulos e as aulas." />
      <Card>
        <CardContent className="p-6">
          <CourseForm {...options} canChooseInstructor={hasPermission(actor.role, "courses.manage")} />
        </CardContent>
      </Card>
    </>
  );
}
