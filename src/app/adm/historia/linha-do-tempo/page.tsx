import { CalendarRange, Star, Trash2 } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listTimeline } from "@/server/services/company";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { formatDate, toDateInput } from "@/lib/format";
import { HistoryTabs } from "../tabs";
import { deleteTimelineAction } from "../actions";
import { TimelineDialog } from "./timeline-dialog";

export const metadata = { title: "Linha do tempo" };

export default async function TimelineAdminPage() {
  await requirePagePermission("content.manage");
  const events = await listTimeline(false);
  return (
    <>
      <PageHeader title="História e cultura" description="Marcos importantes exibidos em ordem cronológica na linha do tempo." />
      <HistoryTabs />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Linha do tempo</CardTitle>
            <CardDescription>{events.length} marcos cadastrados</CardDescription>
          </div>
          <TimelineDialog />
        </CardHeader>
        {events.length ? (
          <ul className="divide-y divide-border">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-4 px-5 py-4">
                {ev.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                    <CalendarRange className="size-6" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-navy-600">{formatDate(ev.date)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{ev.title}</p>
                    {ev.highlight && <Badge tone="spark"><Star className="size-3" aria-hidden="true" /> Destaque</Badge>}
                    {!ev.published && <Badge>Rascunho</Badge>}
                    {ev.isDemo && <DemoBadge />}
                  </div>
                  {ev.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{ev.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <TimelineDialog
                    item={{
                      id: ev.id,
                      date: toDateInput(ev.date),
                      title: ev.title,
                      description: ev.description,
                      imageUrl: ev.imageUrl,
                      highlight: ev.highlight,
                      published: ev.published,
                    }}
                  />
                  <ConfirmAction
                    trigger={<Trash2 />}
                    triggerLabel={`Excluir ${ev.title}`}
                    triggerVariant="ghost"
                    title={`Excluir o marco "${ev.title}"?`}
                    description="O marco será removido da linha do tempo. Essa ação não pode ser desfeita."
                    confirmLabel="Excluir"
                    action={deleteTimelineAction}
                    hidden={{ id: ev.id }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarRange} title="Nenhum marco cadastrado" description="Adicione os principais acontecimentos da história da Gigavale." />
        )}
      </Card>
    </>
  );
}
