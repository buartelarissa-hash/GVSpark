import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { getCourseForEdit } from "@/server/services/courses";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { TabsNav } from "@/components/ui/tabs-nav";
import { COURSE_STATUS } from "@/lib/academy-labels";

export default async function CourseAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const { id } = await params;
  const course = await getCourseForEdit(actor, id);
  if (!course) notFound();
  const base = `/adm/cursos/${course.id}`;
  return (
    <>
      <Link href="/adm/cursos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> Cursos e treinamentos
      </Link>
      <PageHeader
        title={course.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={COURSE_STATUS[course.status].tone}>{COURSE_STATUS[course.status].label}</Badge>
            {course.mandatory && <Badge tone="spark">Obrigatório</Badge>}
            {course.isDemo && <DemoBadge />}
            {[course.category?.name, course.brand?.name, course.instructor && `Instrutor: ${course.instructor.name}`].filter(Boolean).join(" · ")}
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" /> {course._count.enrollments} matrículas
            </span>
          </span>
        }
      />
      <TabsNav
        tabs={[
          { href: base, label: "Estrutura", exact: true },
          { href: `${base}/dados`, label: "Dados do curso" },
          { href: `${base}/atribuicoes`, label: "Atribuições" },
          { href: `/academy/cursos/${course.slug}`, label: "Visualizar" },
        ]}
      />
      {children}
    </>
  );
}
