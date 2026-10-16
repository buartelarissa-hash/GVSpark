import type { Metadata } from "next";
import { requireUser } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/app/alterar-senha/change-password-form";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDate, formatDateTime, tenure } from "@/lib/format";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      registration: true,
      phone: true,
      lastLoginAt: true,
      manager: { select: { name: true } },
    },
  });

  const rows: [string, string][] = [
    ["Usuário", user.username],
    ["E-mail", user.email ?? "—"],
    ["Matrícula", profile.registration ?? "—"],
    ["Telefone", profile.phone ?? "—"],
    ["Cargo", user.position?.title ?? "—"],
    ["Departamento", user.department?.name ?? "—"],
    ["Gestor responsável", profile.manager?.name ?? "—"],
    ["Data de admissão", formatDate(user.admissionDate)],
    ["Tempo de empresa", tenure(user.admissionDate)],
    ["Último acesso", formatDateTime(profile.lastLoginAt)],
  ];

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados cadastrais no GV SPARK. Para corrigir alguma informação, procure o RH ou o administrador." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} src={user.avatarUrl} size="lg" />
              <div>
                <h2 className="text-lg font-semibold text-navy-900">{user.name}</h2>
                <Badge tone="navy" className="mt-1">{ROLE_LABELS[user.role]}</Badge>
              </div>
            </div>
            <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="block">
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>Ao alterar, suas outras sessões abertas serão encerradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
