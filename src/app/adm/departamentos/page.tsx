import { Archive, ArchiveRestore, Briefcase, Building2 } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listDepartments, listPositions } from "@/server/services/organization";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { DepartmentDialog, PositionDialog } from "./org-dialogs";
import { toggleDepartmentAction, togglePositionAction } from "./actions";

export const metadata = { title: "Departamentos e cargos" };

export default async function DepartmentsPage() {
  await requirePagePermission("org.manage");
  const [departments, positions, heads] = await Promise.all([
    listDepartments(),
    listPositions(),
    db.user.findMany({
      where: { status: "ACTIVE", role: { in: ["ADMIN", "GESTOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const depOptions = departments.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name }));

  return (
    <>
      <PageHeader
        title="Departamentos e cargos"
        description="Estrutura usada no cadastro de colaboradores, na atribuição de cursos e nas metas. Itens arquivados deixam de aparecer nos formulários, mas o histórico é preservado."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Departamentos</CardTitle>
              <CardDescription>{departments.length} cadastrados</CardDescription>
            </div>
            <DepartmentDialog departments={depOptions} heads={heads} />
          </CardHeader>
          {departments.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Departamento</TH>
                  <TH>Responsável</TH>
                  <TH className="text-right">Pessoas</TH>
                  <TH><span className="sr-only">Ações</span></TH>
                </tr>
              </THead>
              <TBody>
                {departments.map((d) => (
                  <TR key={d.id} className={d.active ? undefined : "opacity-60"}>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        {d.name}
                        {!d.active && <Badge tone="danger">Arquivado</Badge>}
                        {d.isDemo && <DemoBadge />}
                      </div>
                      {d.parent && <p className="text-xs text-muted">Subordinado a {d.parent.name}</p>}
                    </TD>
                    <TD className="text-muted">{d.head?.name ?? "—"}</TD>
                    <TD className="text-right tabular-nums">{d._count.members}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <DepartmentDialog department={d} departments={depOptions} heads={heads} />
                        <ConfirmAction
                          trigger={d.active ? <Archive /> : <ArchiveRestore />}
                          triggerLabel={d.active ? `Arquivar ${d.name}` : `Reativar ${d.name}`}
                          triggerVariant="ghost"
                          title={d.active ? `Arquivar "${d.name}"?` : `Reativar "${d.name}"?`}
                          description={
                            d.active
                              ? "O departamento deixará de aparecer nos formulários. Colaboradores vinculados permanecem vinculados."
                              : "O departamento voltará a aparecer nos formulários."
                          }
                          confirmLabel={d.active ? "Arquivar" : "Reativar"}
                          confirmVariant={d.active ? "danger" : "navy"}
                          action={toggleDepartmentAction}
                          hidden={{ id: d.id, active: String(!d.active) }}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={Building2} title="Nenhum departamento cadastrado" />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cargos</CardTitle>
              <CardDescription>{positions.length} cadastrados</CardDescription>
            </div>
            <PositionDialog departments={depOptions} />
          </CardHeader>
          {positions.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Cargo</TH>
                  <TH>Departamento</TH>
                  <TH className="text-right">Pessoas</TH>
                  <TH><span className="sr-only">Ações</span></TH>
                </tr>
              </THead>
              <TBody>
                {positions.map((p) => (
                  <TR key={p.id} className={p.active ? undefined : "opacity-60"}>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.title}
                        {!p.active && <Badge tone="danger">Arquivado</Badge>}
                        {p.isDemo && <DemoBadge />}
                      </div>
                    </TD>
                    <TD className="text-muted">{p.department?.name ?? "—"}</TD>
                    <TD className="text-right tabular-nums">{p._count.users}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <PositionDialog position={p} departments={depOptions} />
                        <ConfirmAction
                          trigger={p.active ? <Archive /> : <ArchiveRestore />}
                          triggerLabel={p.active ? `Arquivar ${p.title}` : `Reativar ${p.title}`}
                          triggerVariant="ghost"
                          title={p.active ? `Arquivar "${p.title}"?` : `Reativar "${p.title}"?`}
                          description={
                            p.active
                              ? "O cargo deixará de aparecer nos formulários. Colaboradores com este cargo não são alterados."
                              : "O cargo voltará a aparecer nos formulários."
                          }
                          confirmLabel={p.active ? "Arquivar" : "Reativar"}
                          confirmVariant={p.active ? "danger" : "navy"}
                          action={togglePositionAction}
                          hidden={{ id: p.id, active: String(!p.active) }}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={Briefcase} title="Nenhum cargo cadastrado" />
          )}
        </Card>
      </div>
    </>
  );
}
