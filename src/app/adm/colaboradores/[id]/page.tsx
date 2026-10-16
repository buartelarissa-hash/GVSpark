import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, UserCheck, UserX } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { getUserForActor, userFormOptions } from "@/server/services/users";
import { canEditUser, hasPermission } from "@/server/permissions/permissions";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/roles";
import { auditLabel } from "@/lib/audit-labels";
import { formatDate, formatDateTime, tenure, toDateInput } from "@/lib/format";
import { UserForm } from "../user-form";
import { resetPasswordAction, setUserStatusAction, updateUserAction } from "../actions";

export const metadata = { title: "Colaborador" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("users.view");
  const { id } = await params;
  // A consulta já aplica o escopo do perfil: gestor só encontra a própria equipe.
  const user = await getUserForActor(actor, id);
  if (!user) notFound();
  // canManage: perfil de acesso e desativação (administrador geral).
  // canEdit: dados cadastrais e senha temporária (administrador ou gestor da equipe).
  const canManage = hasPermission(actor.role, "users.manage");
  const canEdit = hasPermission(actor.role, "users.edit") && canEditUser(actor, user);
  const isSelf = actor.id === user.id;

  const [options, history] = await Promise.all([
    canEdit ? userFormOptions() : null,
    hasPermission(actor.role, "audit.view")
      ? db.auditLog.findMany({
          where: { entity: "User", entityId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
        })
      : null,
  ]);

  return (
    <>
      <Link href="/adm/colaboradores" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> Colaboradores
      </Link>
      <PageHeader
        title={user.name}
        description={[user.position?.title, user.department?.name].filter(Boolean).join(" · ") || undefined}
        actions={
          canEdit && (
            <>
              <ConfirmAction
                trigger={<><KeyRound /> Gerar senha temporária</>}
                title="Gerar nova senha temporária?"
                description="A senha atual deixará de funcionar e as sessões abertas do colaborador serão encerradas."
                confirmLabel="Gerar senha"
                confirmVariant="navy"
                action={resetPasswordAction}
                hidden={{ id: user.id }}
                onDoneMessage
              />
              {canManage &&
                !isSelf &&
                (user.status === "ACTIVE" ? (
                  <ConfirmAction
                    trigger={<><UserX /> Desativar acesso</>}
                    title="Desativar o acesso deste colaborador?"
                    description="Ele não conseguirá mais entrar no GV SPARK. Todo o histórico (cursos, notas e certificados) é preservado e o acesso pode ser reativado depois."
                    confirmLabel="Desativar"
                    action={setUserStatusAction}
                    hidden={{ id: user.id, status: "INACTIVE" }}
                  />
                ) : (
                  <ConfirmAction
                    trigger={<><UserCheck /> Reativar acesso</>}
                    title="Reativar o acesso deste colaborador?"
                    description="Ele voltará a conseguir entrar com a senha atual."
                    confirmLabel="Reativar"
                    confirmVariant="navy"
                    action={setUserStatusAction}
                    hidden={{ id: user.id, status: "ACTIVE" }}
                  />
                ))}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar name={user.name} size="lg" />
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{STATUS_LABELS[user.status]}</Badge>
                    {user.isDemo && <DemoBadge />}
                  </div>
                  <Badge tone="navy">{ROLE_LABELS[user.role]}</Badge>
                </div>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ["Usuário", user.username],
                  ["E-mail", user.email ?? "—"],
                  ["Matrícula", user.registration ?? "—"],
                  ["Gestor", user.manager?.name ?? "—"],
                  ["Admissão", formatDate(user.admissionDate)],
                  ["Tempo de empresa", tenure(user.admissionDate)],
                  ["Último acesso", formatDateTime(user.lastLoginAt)],
                  ["Cadastrado em", formatDate(user.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {history && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de alterações</CardTitle>
              </CardHeader>
              {history.length ? (
                <ul className="divide-y divide-border text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="px-5 py-3">
                      <p className="font-medium">{auditLabel(h.action)}</p>
                      <p className="text-xs text-muted">
                        {h.actor?.name ?? "Sistema"} · {formatDateTime(h.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-sm text-muted">Sem registros.</p>
              )}
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{canEdit ? "Editar cadastro" : "Dados do colaborador"}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {canEdit && options ? (
              <UserForm
                action={updateUserAction}
                options={options}
                submitLabel="Salvar alterações"
                canEditRole={canManage}
                defaults={{
                  id: user.id,
                  name: user.name,
                  username: user.username,
                  email: user.email,
                  role: user.role,
                  registration: user.registration,
                  phone: user.phone,
                  admissionDate: toDateInput(user.admissionDate),
                  departmentId: user.departmentId,
                  positionId: user.positionId,
                  managerId: user.managerId,
                }}
              />
            ) : (
              <p className="text-sm text-muted">
                Você pode consultar os dados deste colaborador, mas não pode alterá-los.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
