import { Megaphone, Pin, Trash2 } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listAnnouncements } from "@/server/services/company";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { dayFromEndOfDaySaoPaulo, formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { HistoryTabs } from "../tabs";
import { deleteAnnouncementAction } from "../actions";
import { AnnouncementDialog } from "./announcement-dialog";

export const metadata = { title: "Comunicados" };

function status(a: { publishedAt: Date | null; expiresAt: Date | null }, now: Date) {
  if (!a.publishedAt) return <Badge>Rascunho</Badge>;
  if (a.expiresAt && a.expiresAt <= now) return <Badge tone="danger">Expirado</Badge>;
  return <Badge tone="success">Publicado</Badge>;
}

export default async function AnnouncementsAdminPage() {
  await requirePagePermission("content.manage");
  const items = await listAnnouncements();
  const now = new Date();
  return (
    <>
      <PageHeader title="História e cultura" description="Comunicados internos exibidos na página inicial dos colaboradores." />
      <HistoryTabs />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Comunicados</CardTitle>
            <CardDescription>{items.length} cadastrados</CardDescription>
          </div>
          <AnnouncementDialog />
        </CardHeader>
        {items.length ? (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <Pin className="size-3.5 text-spark-600" aria-label="Fixado" />}
                    <p className="font-semibold">{a.title}</p>
                    {status(a, now)}
                    {a.isDemo && <DemoBadge />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {a.publishedAt ? `Publicado em ${formatDateTime(a.publishedAt)}` : "Não publicado"}
                    {a.expiresAt && ` · exibir até ${formatDate(dayFromEndOfDaySaoPaulo(a.expiresAt))}`}
                    {a.author && ` · por ${a.author.name}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <AnnouncementDialog
                    item={{
                      id: a.id,
                      title: a.title,
                      body: a.body,
                      publishedAt: a.publishedAt?.toISOString() ?? null,
                      expiresAt: a.expiresAt ? toDateInput(dayFromEndOfDaySaoPaulo(a.expiresAt)) : "",
                      pinned: a.pinned,
                    }}
                  />
                  <ConfirmAction
                    trigger={<Trash2 />}
                    triggerLabel={`Excluir ${a.title}`}
                    triggerVariant="ghost"
                    title={`Excluir o comunicado "${a.title}"?`}
                    description="O comunicado será removido. Essa ação não pode ser desfeita."
                    confirmLabel="Excluir"
                    action={deleteAnnouncementAction}
                    hidden={{ id: a.id }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Megaphone} title="Nenhum comunicado" />
        )}
      </Card>
    </>
  );
}
