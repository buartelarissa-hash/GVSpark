import { Route, Trash2 } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listLearningPaths } from "@/server/services/assignments";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { COURSE_STATUS } from "@/lib/academy-labels";
import { AcademyTabs } from "../tabs";
import { deletePathAction } from "../actions";
import { PathDialog } from "./path-dialog";

export const metadata = { title: "Trilhas de aprendizagem" };

export default async function LearningPathsPage() {
  await requirePagePermission("courses.manage");
  const [paths, positions, courses] = await Promise.all([
    listLearningPaths(),
    db.position.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, department: { select: { name: true } } } }),
    db.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true } }),
  ]);
  const posOpts = positions.map((p) => ({ id: p.id, label: p.department ? `${p.title} (${p.department.name})` : p.title }));
  const courseOpts = courses.map((c) => ({ id: c.id, label: c.status === "PUBLISHED" ? c.title : `${c.title} (${COURSE_STATUS[c.status].label.toLowerCase()})` }));
  return (
    <>
      <PageHeader title="Cursos e treinamentos" description="Trilhas automáticas por cargo: quem entra no cargo recebe os cursos da trilha." />
      <AcademyTabs admin />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trilhas de aprendizagem</CardTitle>
            <CardDescription>Ex.: ao cadastrar um vendedor interno, atribuir a trilha de integração e treinamento comercial.</CardDescription>
          </div>
          <PathDialog positions={posOpts} courses={courseOpts} />
        </CardHeader>
        {paths.length ? (
          <ul className="divide-y divide-border">
            {paths.map((p) => (
              <li key={p.id} className="flex items-start gap-4 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Route className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {p.name}
                    {p.autoAssign && p.position && <Badge tone="spark">Automática</Badge>}
                  </p>
                  <p className="text-sm text-muted">{p.position ? `Cargo: ${p.position.title}` : "Sem cargo vinculado"}</p>
                  <ol className="mt-2 flex flex-wrap gap-1.5">
                    {p.courses.map((c, i) => (
                      <li key={c.courseId}>
                        <Badge>{i + 1}. {c.course.title}</Badge>
                      </li>
                    ))}
                  </ol>
                </div>
                <PathDialog
                  path={{ id: p.id, name: p.name, description: p.description, positionId: p.positionId, autoAssign: p.autoAssign, courseIds: p.courses.map((c) => c.courseId) }}
                  positions={posOpts}
                  courses={courseOpts}
                />
                <ConfirmAction
                  trigger={<Trash2 />}
                  triggerLabel={`Excluir ${p.name}`}
                  triggerVariant="ghost"
                  title={`Excluir a trilha "${p.name}"?`}
                  description="Novos colaboradores do cargo deixarão de receber os cursos automaticamente. Matrículas existentes são mantidas."
                  confirmLabel="Excluir"
                  action={deletePathAction}
                  hidden={{ id: p.id }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Route} title="Nenhuma trilha" />
        )}
      </Card>
    </>
  );
}
