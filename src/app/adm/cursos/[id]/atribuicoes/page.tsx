import { notFound } from "next/navigation";
import { Trash2, UserCheck } from "lucide-react";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { getCourseForEdit } from "@/server/services/courses";
import { listAssignments } from "@/server/services/assignments";
import { db } from "@/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ASSIGNMENT_TARGET } from "@/lib/academy-labels";
import { dayFromEndOfDaySaoPaulo, formatDate } from "@/lib/format";
import { removeAssignmentAction } from "../../actions";
import { AssignForm } from "./assign-form";

export const metadata = { title: "Atribuições do curso" };

const ENROLL_STATUS = { NOT_STARTED: ["Não iniciado", "neutral"], IN_PROGRESS: ["Em andamento", "info"], COMPLETED: ["Concluído", "success"] } as const;

export default async function CourseAssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const { id } = await params;
  const course = await getCourseForEdit(actor, id);
  if (!course) notFound();
  const [assignments, departments, positions, users, enrollments] = await Promise.all([
    listAssignments(course.id),
    db.department.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.position.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, department: { select: { name: true } } } }),
    db.user.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.enrollment.findMany({
      where: { courseId: course.id },
      orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
      include: { user: { select: { name: true, avatarUrl: true } } },
    }),
  ]);
  const targetLabel = (a: (typeof assignments)[number]) =>
    a.targetType === "ALL" ? ASSIGNMENT_TARGET.ALL : a.targetType === "DEPARTMENT" ? `Departamento: ${a.department?.name ?? "—"}` : a.targetType === "POSITION" ? `Cargo: ${a.position?.title ?? "—"}` : `Colaborador: ${a.user?.name ?? "—"}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <Card className="h-fit">
        <CardHeader className="block">
          <CardTitle>Nova atribuição</CardTitle>
          <CardDescription>
            Quem entrar depois no departamento ou cargo também recebe o curso automaticamente.
            {course.status !== "PUBLISHED" && " O curso ainda não está publicado: as matrículas ficam visíveis quando for publicado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignForm
            courseId={course.id}
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            positions={positions.map((p) => ({ id: p.id, label: p.department ? `${p.title} (${p.department.name})` : p.title }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Regras de atribuição</CardTitle>
              <CardDescription>Remover uma regra não apaga matrículas já criadas.</CardDescription>
            </div>
          </CardHeader>
          {assignments.length ? (
            <ul className="divide-y divide-border">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {targetLabel(a)} {a.mandatory && <Badge tone="spark">Obrigatório</Badge>}
                    </p>
                    <p className="text-xs text-muted">
                      {a.dueDate ? `Prazo: ${formatDate(dayFromEndOfDaySaoPaulo(a.dueDate))} · ` : ""}
                      por {a.assignedBy?.name ?? "—"} em {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <ConfirmAction
                    trigger={<Trash2 />}
                    triggerLabel="Remover regra"
                    triggerVariant="ghost"
                    title="Remover esta regra de atribuição?"
                    description="Novos colaboradores deixarão de receber o curso por esta regra. As matrículas existentes são mantidas."
                    confirmLabel="Remover"
                    action={removeAssignmentAction}
                    hidden={{ id: a.id, courseId: course.id }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={UserCheck} title="Nenhuma atribuição" className="py-8" />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Matrículas</CardTitle>
              <CardDescription>{enrollments.length} colaboradores</CardDescription>
            </div>
          </CardHeader>
          {enrollments.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Colaborador</TH>
                  <TH>Situação</TH>
                  <TH className="hidden md:table-cell">Prazo</TH>
                  <TH className="hidden md:table-cell">Conclusão</TH>
                </tr>
              </THead>
              <TBody>
                {enrollments.map((en) => {
                  const [label, tone] = ENROLL_STATUS[en.status];
                  const late = en.status !== "COMPLETED" && en.dueDate && en.dueDate < new Date();
                  return (
                    <TR key={en.id}>
                      <TD>
                        <span className="flex items-center gap-2">
                          <Avatar name={en.user.name} src={en.user.avatarUrl} size="sm" />
                          <span className="font-medium">{en.user.name}</span>
                          {en.mandatory && <Badge tone="spark">Obrigatório</Badge>}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={tone}>{label}</Badge> {late && <Badge tone="danger">Atrasado</Badge>}
                      </TD>
                      <TD className="hidden text-muted md:table-cell">{en.dueDate ? formatDate(dayFromEndOfDaySaoPaulo(en.dueDate)) : "—"}</TD>
                      <TD className="hidden text-muted md:table-cell">{formatDate(en.completedAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={UserCheck} title="Ninguém matriculado ainda" className="py-8" />
          )}
        </Card>
      </div>
    </div>
  );
}
