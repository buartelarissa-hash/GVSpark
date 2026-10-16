import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { myEnrollments } from "@/server/services/learning";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TabsNav } from "@/components/ui/tabs-nav";
import { CourseCard } from "@/components/academy/course-card";
import { db } from "@/server/db";

export const metadata = { title: "Meus cursos" };

export default async function MyCoursesPage() {
  const user = await requireUser();
  const mine = await myEnrollments(user);
  const details = await db.course.findMany({
    where: { id: { in: mine.map((e) => e.courseId) } },
    select: { id: true, description: true, level: true, durationMinutes: true, brand: { select: { name: true } } },
  });
  const byId = new Map(details.map((d) => [d.id, d]));
  const groups = [
    { title: "Em andamento", items: mine.filter((e) => e.status === "IN_PROGRESS") },
    { title: "A fazer", items: mine.filter((e) => e.status === "NOT_STARTED") },
    { title: "Concluídos", items: mine.filter((e) => e.status === "COMPLETED") },
  ];
  return (
    <>
      <PageHeader eyebrow="GV Spark Academy" title="Meus cursos" description="Cursos atribuídos a você e os que você começou." />
      <TabsNav tabs={[{ href: "/academy", label: "Catálogo", exact: true }, { href: "/academy/meus-cursos", label: `Meus cursos (${mine.length})` }, { href: "/academy/marcas", label: "Marcas parceiras" }]} />
      {mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Você ainda não tem cursos"
            description="Explore o catálogo e comece um treinamento."
            action={
              <Button asChild>
                <Link href="/academy">Ver catálogo</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.filter((g) => g.items.length).map((g) => (
            <section key={g.title}>
              <h2 className="mb-3 text-lg font-bold text-navy-900">
                {g.title} <span className="text-sm font-medium text-muted">({g.items.length})</span>
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map((e) => {
                  const d = byId.get(e.courseId);
                  return (
                    <li key={e.id}>
                      <CourseCard
                        c={{
                          slug: e.course.slug,
                          title: e.course.title,
                          description: d?.description ?? null,
                          coverUrl: e.course.coverUrl,
                          level: d?.level ?? "BASIC",
                          durationMinutes: d?.durationMinutes ?? null,
                          category: e.course.category,
                          brand: d?.brand ?? null,
                          enrollment: { status: e.status, mandatory: e.mandatory || e.course.mandatory, dueDate: e.dueDate },
                          percent: e.percent,
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
