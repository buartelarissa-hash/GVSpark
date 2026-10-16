import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, ListChecks, Trash2, Users } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { trackParticipants } from "@/server/services/onboarding";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { STEP_TYPE_LABELS } from "@/lib/onboarding";
import { formatDate, tenure } from "@/lib/format";
import { StepDialog, TrackDialog } from "../dialogs";
import { deleteStepAction, deleteTrackAction, moveStepAction } from "../actions";

export const metadata = { title: "Trilha de integração" };

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const track = await db.onboardingTrack.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } }, position: { select: { title: true } } },
  });
  if (!track) notFound();
  const [positions, participants, courses] = await Promise.all([
    db.position.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, department: { select: { name: true } } } }),
    trackParticipants(id),
    db.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true } }),
  ]);
  const courseOpts = courses.map((c) => ({ id: c.id, label: c.status === "PUBLISHED" ? c.title : `${c.title} (não publicado)` }));
  const posOpts = positions.map((p) => ({ id: p.id, label: p.department ? `${p.title} (${p.department.name})` : p.title }));

  return (
    <>
      <Link href="/adm/integracao" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> Trilhas de integração
      </Link>
      <PageHeader
        title={track.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {track.isDefault && <Badge tone="spark">Padrão</Badge>}
            {!track.active && <Badge tone="danger">Inativa</Badge>}
            {track.position ? `Cargo: ${track.position.title}` : "Todos os cargos sem trilha própria"}
          </span>
        }
        actions={
          <>
            <TrackDialog
              track={{
                id: track.id,
                name: track.name,
                description: track.description,
                positionId: track.positionId,
                isDefault: track.isDefault,
                active: track.active,
              }}
              positions={posOpts}
            />
            <ConfirmAction
              trigger={<><Trash2 /> Excluir</>}
              title={`Excluir a trilha "${track.name}"?`}
              description="Se algum colaborador já tiver progresso nela, a trilha será apenas desativada para preservar o histórico."
              confirmLabel="Excluir"
              action={deleteTrackAction}
              hidden={{ id: track.id }}
            />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Etapas</CardTitle>
              <CardDescription>As obrigatórias precisam ser concluídas na ordem.</CardDescription>
            </div>
            <StepDialog trackId={track.id} courses={courseOpts} />
          </CardHeader>
          {track.steps.length ? (
            <ol className="divide-y divide-border">
              {track.steps.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {s.title}
                      {!s.required && <Badge>Opcional</Badge>}
                    </p>
                    <p className="text-xs text-muted">{STEP_TYPE_LABELS[s.type]}{s.description ? ` · ${s.description}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <form action={moveStepAction}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button type="submit" variant="ghost" size="icon" disabled={i === 0} aria-label={`Mover ${s.title} para cima`}>
                        <ArrowUp />
                      </Button>
                    </form>
                    <form action={moveStepAction}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button type="submit" variant="ghost" size="icon" disabled={i === track.steps.length - 1} aria-label={`Mover ${s.title} para baixo`}>
                        <ArrowDown />
                      </Button>
                    </form>
                    <StepDialog trackId={track.id} step={s} courses={courseOpts} />
                    <ConfirmAction
                      trigger={<Trash2 />}
                      triggerLabel={`Excluir ${s.title}`}
                      triggerVariant="ghost"
                      title={`Excluir a etapa "${s.title}"?`}
                      description="O progresso dos colaboradores nesta etapa também será removido."
                      confirmLabel="Excluir"
                      action={deleteStepAction}
                      hidden={{ id: s.id, trackId: track.id }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={ListChecks} title="Nenhuma etapa" description="Adicione as etapas da integração." />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Andamento dos colaboradores</CardTitle>
              <CardDescription>{participants.length} seguindo esta trilha</CardDescription>
            </div>
          </CardHeader>
          {participants.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Colaborador</TH>
                  <TH className="w-32">Progresso</TH>
                </tr>
              </THead>
              <TBody>
                {participants.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link href={`/adm/colaboradores/${p.id}`} className="flex items-center gap-2">
                        <Avatar name={p.name} src={p.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {p.admissionDate ? `${tenure(p.admissionDate)} de empresa` : (p.position ?? "—")}
                            {p.lastActivity && ` · última etapa em ${formatDate(p.lastActivity)}`}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      {p.completed ? (
                        <Badge tone="success">Concluída</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress value={p.percent} label={`Progresso de ${p.name}`} className="w-16" />
                          <span className="text-xs font-semibold tabular-nums">{p.percent}%</span>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={Users} title="Ninguém nesta trilha" description={track.active ? undefined : "A trilha está inativa."} />
          )}
        </Card>
      </div>
    </>
  );
}
