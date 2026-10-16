import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  GraduationCap,
  Landmark,
  MessageCircleQuestion,
  Network,
  Pin,
  Rocket,
  Target,
  Timer,
  Trophy,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { getCollaboratorDashboard } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { firstName } from "@/lib/utils";
import { formatDate, tenure } from "@/lib/format";

export const metadata: Metadata = { title: "Início" };

const quickLinks = [
  { href: "/integracao", label: "Minha integração", icon: Rocket },
  { href: "/academy", label: "Cursos", icon: GraduationCap },
  { href: "/nossa-historia", label: "Nossa história", icon: Landmark },
  { href: "/organograma", label: "Organograma", icon: Network },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/duvidas", label: "Tirar dúvida", icon: MessageCircleQuestion },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getCollaboratorDashboard(user);

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-navy-700/70" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full border-[1.5rem] border-spark-500/15" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.avatarUrl} size="xl" className="ring-4 ring-spark-500/80" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {firstName(user.name)}!</h1>
            <p className="mt-1 text-navy-100/85">Bem-vindo ao GV SPARK. Seu desenvolvimento começa aqui.</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy-100/90">
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="size-4 text-spark-500" aria-hidden="true" />
                {user.position?.title ?? "Cargo não informado"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-4 text-spark-500" aria-hidden="true" />
                {user.department?.name ?? "Departamento não informado"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="size-4 text-spark-500" aria-hidden="true" />
                {user.admissionDate ? `${tenure(user.admissionDate)} de empresa` : "Data de admissão não informada"}
              </span>
              {data.managerName && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-4 text-spark-500" aria-hidden="true" />
                  Gestor: {data.managerName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Acesso rápido */}
      <nav aria-label="Acesso rápido" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-white px-2 py-4 text-center text-xs font-semibold text-ink shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-spark-500"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700 transition-colors group-hover:bg-spark-500 group-hover:text-navy-900">
              <l.icon className="size-5" aria-hidden="true" />
            </span>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Integração */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Progresso da integração</CardTitle>
                <p className="mt-0.5 text-sm text-muted">Sua jornada de boas-vindas na Gigavale.</p>
              </div>
              <Rocket className="size-5 text-navy-600" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              {data.onboarding ? (
                <div>
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="text-muted">
                      {data.onboarding.completed} de {data.onboarding.total} etapas concluídas
                    </span>
                    <span className="text-lg font-bold text-navy-900">{data.onboarding.percent}%</span>
                  </div>
                  <Progress value={data.onboarding.percent} label="Progresso da integração" />
                  <Link href="/integracao" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
                    {data.onboarding.finished ? "Rever minha integração" : "Continuar minha integração"} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Sua trilha de integração ainda não foi configurada. Ela aparecerá aqui assim que estiver disponível.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Treinamentos em andamento</CardTitle>
                <BookOpen className="size-5 text-navy-600" aria-hidden="true" />
              </CardHeader>
              {data.inProgress.length ? (
                <ul className="divide-y divide-border">
                  {data.inProgress.map((e) => (
                    <li key={e.id} className="px-5 py-3 text-sm font-medium">{e.course.title}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={BookOpen} title="Nenhum treinamento em andamento" description="Quando você iniciar um curso, ele aparecerá aqui." />
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos obrigatórios</CardTitle>
                <CalendarClock className="size-5 text-navy-600" aria-hidden="true" />
              </CardHeader>
              {data.mandatoryPending.length ? (
                <ul className="divide-y divide-border">
                  {data.mandatoryPending.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="font-medium">{e.course.title}</span>
                      {e.dueDate && <Badge tone="warning">até {formatDate(e.dueDate)}</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={CalendarClock} title="Nada pendente" description="Você não tem treinamentos obrigatórios pendentes." />
              )}
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cursos recomendados</CardTitle>
              <GraduationCap className="size-5 text-navy-600" aria-hidden="true" />
            </CardHeader>
            {data.recommended.length ? (
              <ul className="grid gap-4 p-5 sm:grid-cols-3">
                {data.recommended.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border p-4">
                    {c.category && <Badge>{c.category.name}</Badge>}
                    <p className="mt-2 text-sm font-semibold">{c.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="O catálogo da GV Spark Academy está sendo preparado"
                description="Os cursos publicados pelos administradores aparecerão aqui."
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comunicados</CardTitle>
              <Bell className="size-5 text-navy-600" aria-hidden="true" />
            </CardHeader>
            {data.announcements.length ? (
              <ul className="divide-y divide-border">
                {data.announcements.map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && <Pin className="size-3.5 text-spark-600" aria-label="Fixado" />}
                      <p className="text-sm font-semibold">{a.title}</p>
                      {a.isDemo && <DemoBadge />}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{a.body}</p>
                    <p className="mt-2 text-xs text-muted">{formatDate(a.publishedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Bell} title="Sem comunicados no momento" />
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minhas metas do mês</CardTitle>
              <Target className="size-5 text-navy-600" aria-hidden="true" />
            </CardHeader>
            {data.indicators.length ? (
              <ul className="space-y-4 p-5">
                {data.indicators.map((i) => {
                  const pct = i.actual !== null && i.target > 0 ? Math.round((i.actual / i.target) * 100) : null;
                  const fmt = (v: number) => (i.unit === "CURRENCY" ? money.format(v) : i.unit === "PERCENT" ? `${v}%` : v.toLocaleString("pt-BR"));
                  return (
                    <li key={i.id}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{i.name}</span>
                        <span className="font-semibold">{pct === null ? "—" : `${pct}%`}</span>
                      </div>
                      <Progress value={pct ?? 0} label={i.name} className="mt-2" />
                      <p className="mt-1 text-xs text-muted">
                        {i.actual === null ? "Sem resultado lançado" : fmt(i.actual)} de {fmt(i.target)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Target} title="Nenhuma meta cadastrada" description="Quando houver metas para o seu cargo, elas aparecerão aqui." />
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conquistas recentes</CardTitle>
              <Trophy className="size-5 text-navy-600" aria-hidden="true" />
            </CardHeader>
            {data.badges.length ? (
              <ul className="divide-y divide-border">
                {data.badges.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Award className="size-5 text-spark-600" aria-hidden="true" />
                    <span className="font-medium">{b.badge.name}</span>
                    <span className="ml-auto text-xs text-muted">{formatDate(b.awardedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Trophy} title="Suas conquistas aparecerão aqui" />
            )}
          </Card>

          <Link href="/perfil" className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 text-sm font-semibold text-navy-700 hover:border-spark-500">
            Ver meu perfil <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
