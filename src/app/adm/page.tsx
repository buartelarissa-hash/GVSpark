import Link from "next/link";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Hourglass,
  MessageCircleQuestion,
  PercentCircle,
  PlayCircle,
  RotateCcw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { getAdminDashboard } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/server/permissions/permissions";
import { firstName } from "@/lib/utils";
import { formatDate } from "@/lib/format";

function Stat({ label, value, icon: Icon, highlight }: { label: string; value: string | number; icon: LucideIcon; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-spark-500/60" : undefined}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${highlight ? "bg-spark-500 text-navy-900" : "bg-navy-50 text-navy-700"}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-navy-900">{value}</p>
          <p className="text-xs font-medium leading-snug text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const user = await requirePagePermission("admin.access");
  const d = await getAdminDashboard(user);
  const scopeNote = user.role === "GESTOR" ? "Números referentes à sua equipe." : undefined;

  return (
    <>
      <PageHeader
        eyebrow="GV SPARK ADM"
        title={`Olá, ${firstName(user.name)}`}
        description={scopeNote ?? "Visão geral da plataforma."}
        actions={
          hasPermission(user.role, "users.manage") && (
            <Button asChild>
              <Link href="/adm/colaboradores/novo">
                <Users /> Novo colaborador
              </Link>
            </Button>
          )
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Colaboradores ativos" value={d.activeUsers} icon={Users} />
        <Stat label="Departamentos ativos" value={d.departments} icon={Building2} />
        <Stat label="Cursos publicados" value={d.publishedCourses} icon={BookOpen} />
        <Stat label="Taxa de conclusão" value={d.completionRate === null ? "—" : `${d.completionRate}%`} icon={PercentCircle} />
        <Stat label="Cursos em andamento" value={d.enrollmentsInProgress} icon={PlayCircle} />
        <Stat label="Treinamentos concluídos" value={d.enrollmentsCompleted} icon={CheckCircle2} />
        <Stat label="Avaliações aguardando análise" value={d.awaitingGrading} icon={ClipboardCheck} highlight={d.awaitingGrading > 0} />
        <Stat label="Resultados aguardando liberação" value={d.awaitingRelease} icon={Hourglass} highlight={d.awaitingRelease > 0} />
        <Stat label="Novas tentativas a avaliar" value={d.retakesPending} icon={RotateCcw} highlight={d.retakesPending > 0} />
        <Stat label="Dúvidas pendentes" value={d.pendingInquiries} icon={MessageCircleQuestion} highlight={d.pendingInquiries > 0} />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Cadastros recentes</CardTitle>
          {hasPermission(user.role, "users.view") && (
            <Link href="/adm/colaboradores" className="text-sm font-semibold text-navy-700 hover:underline">
              Ver todos
            </Link>
          )}
        </CardHeader>
        {d.recentUsers.length ? (
          <ul className="divide-y divide-border">
            {d.recentUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/adm/colaboradores/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/50">
                  <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      {u.name} {u.isDemo && <DemoBadge />}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {[u.position?.title, u.department?.name].filter(Boolean).join(" · ") || "Sem cargo definido"}
                    </p>
                  </div>
                  <span className="hidden text-xs text-muted sm:block">{formatDate(u.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Users} title="Nenhum colaborador cadastrado" />
        )}
      </Card>
    </>
  );
}
