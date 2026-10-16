import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Lock, PartyPopper, Rocket, Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { getUserOnboarding } from "@/server/services/onboarding";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextView } from "@/components/content/rich-text-view";
import { AUTO_COMPLETED_TYPES, STEP_TYPE_LABELS, STEP_TYPE_LINKS, canCompleteManually } from "@/lib/onboarding";
import { safeHref } from "@/lib/rich-text";
import { formatDate } from "@/lib/format";
import { cn, firstName } from "@/lib/utils";
import { CompleteButton } from "./complete-button";

export const metadata = { title: "Minha integração" };

const LINK_LABELS: Record<string, string> = {
  "/nossa-historia": "Abrir Nossa história",
  "/nossa-historia#valores": "Ver missão, visão e valores",
  "/organograma": "Abrir o organograma",
  "/academy": "Ir para a Academy",
};
const linkLabel = (href: string) => LINK_LABELS[href] ?? (href.startsWith("/academy/cursos/") ? "Abrir o curso" : "Abrir");

export default async function OnboardingPage() {
  const user = await requireUser();
  const data = await getUserOnboarding(user);

  if (!data) {
    return (
      <>
        <PageHeader title="Minha integração" />
        <Card>
          <EmptyState icon={Rocket} title="Sua trilha de integração ainda não foi configurada" description="Assim que o RH disponibilizar a trilha, ela aparecerá aqui." />
        </Card>
      </>
    );
  }

  const { track, states, completedAt } = data;
  const refIds = track.steps.filter((s) => s.type === "COURSE" && s.refId).map((s) => s.refId!);
  const courseSlugs = new Map(
    (await db.course.findMany({ where: { id: { in: refIds } }, select: { id: true, slug: true } })).map((c) => [c.id, `/academy/cursos/${c.slug}`]),
  );
  return (
    <>
      <PageHeader
        eyebrow="Integração"
        title={data.completed ? `Parabéns, ${firstName(user.name)}!` : "Minha integração"}
        description={track.description ?? "Siga as etapas abaixo. Os materiais de consulta continuam disponíveis no menu a qualquer momento."}
      />

      <Card className="mb-6 overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", data.completed ? "bg-spark-500 text-navy-900" : "bg-navy-50 text-navy-700")}>
            {data.completed ? <PartyPopper className="size-6" aria-hidden="true" /> : <Rocket className="size-6" aria-hidden="true" />}
          </span>
          <div className="flex-1">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <p className="text-sm font-semibold text-navy-900">
                {data.completed ? "Integração concluída" : `${data.doneCount} de ${data.total} etapas concluídas`}
              </p>
              <span className="text-2xl font-bold tabular-nums text-navy-900">{data.percent}%</span>
            </div>
            <Progress value={data.percent} label="Progresso da integração" className="h-3" />
          </div>
        </CardContent>
      </Card>

      <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[1.2rem] before:top-6 before:w-0.5 before:bg-navy-100">
        {track.steps.map((step, i) => {
          const state = states.get(step.id)!;
          const auto = AUTO_COMPLETED_TYPES.includes(step.type);
          const link =
            (step.type === "CUSTOM" ? safeHref(step.linkUrl) : null) ??
            (step.type === "COURSE" && step.refId ? (courseSlugs.get(step.refId) ?? null) : null) ??
            STEP_TYPE_LINKS[step.type];
          const isNext = data.nextStepId === step.id;
          return (
            <li key={step.id} className="relative pl-14">
              <span
                className={cn(
                  "absolute left-0 top-5 flex size-10 items-center justify-center rounded-full text-sm font-bold ring-4 ring-surface",
                  state === "done" && "bg-success text-white",
                  state === "available" && (isNext ? "bg-spark-500 text-navy-900" : "bg-navy-700 text-white"),
                  state === "locked" && "bg-navy-100 text-muted",
                )}
                aria-hidden="true"
              >
                {state === "done" ? <Check className="size-5" /> : state === "locked" ? <Lock className="size-4" /> : i + 1}
              </span>
              <Card className={cn(isNext && "border-spark-500 ring-2 ring-spark-500/30", state === "locked" && "opacity-70")}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-navy-600">{STEP_TYPE_LABELS[step.type]}</span>
                    {!step.required && <Badge>Opcional</Badge>}
                    {state === "done" && (
                      <Badge tone="success">Concluída{completedAt.get(step.id) ? ` em ${formatDate(completedAt.get(step.id))}` : ""}</Badge>
                    )}
                    {isNext && <Badge tone="spark"><Sparkles className="size-3" aria-hidden="true" /> Próxima etapa</Badge>}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-navy-900">
                    <span className="sr-only">Etapa {i + 1}: </span>
                    {step.title}
                  </h2>
                  {step.description && <p className="mt-1 text-sm text-muted">{step.description}</p>}
                  {step.content && state !== "locked" && <RichTextView doc={step.content} className="mt-4 rounded-lg bg-surface p-4 text-sm" />}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {link && state !== "locked" && (
                      <Button asChild variant="outline" size="sm">
                        {link.startsWith("http") ? (
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            Abrir link <ExternalLink />
                          </a>
                        ) : (
                          <Link href={link}>
                            {linkLabel(link)} <ArrowRight />
                          </Link>
                        )}
                      </Button>
                    )}
                    {canCompleteManually(step, state) && <CompleteButton stepId={step.id} />}
                    {state === "locked" && step.type !== "CONCLUSION" && <p className="text-xs text-muted">Conclua as etapas obrigatórias anteriores para liberar esta etapa.</p>}
                    {auto && state === "available" && step.type !== "CONCLUSION" && (
                      <p className="text-xs text-muted">
                        {step.type === "COURSE"
                          ? "Esta etapa é concluída automaticamente quando você terminar o treinamento na GV Spark Academy."
                          : "Esta etapa é concluída automaticamente quando o resultado da sua avaliação for liberado com aprovação."}
                      </p>
                    )}
                    {step.type === "CONCLUSION" && state !== "done" && (
                      <p className="text-xs text-muted">Será concluída automaticamente ao terminar as etapas obrigatórias.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
