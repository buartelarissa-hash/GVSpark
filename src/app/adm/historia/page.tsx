import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Landmark, Pencil, Plus, Trash2, Video } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listSectionsForAdmin } from "@/server/services/company";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { SECTION_TYPES } from "@/lib/company-sections";
import { richDocToText } from "@/lib/rich-text";
import { formatDateTime } from "@/lib/format";
import { HistoryTabs } from "./tabs";
import { deleteSectionAction, moveSectionAction, publishSectionAction } from "./actions";

export const metadata = { title: "História e cultura" };

export default async function HistoryAdminPage() {
  await requirePagePermission("content.manage");
  const sections = await listSectionsForAdmin();

  return (
    <>
      <PageHeader
        title="História e cultura"
        description="Conteúdo exibido aos colaboradores em “Nossa história”. Só aparecem as seções publicadas."
        actions={
          <Button asChild variant="outline">
            <Link href="/nossa-historia" target="_blank">
              <ExternalLink /> Ver como colaborador
            </Link>
          </Button>
        }
      />
      <HistoryTabs />

      <div className="space-y-6">
        {SECTION_TYPES.map(({ type, label, hint }) => {
          const items = sections.filter((s) => s.type === type);
          return (
            <Card key={type}>
              <CardHeader>
                <div>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>{hint}</CardDescription>
                </div>
                <Button asChild size="sm" variant={items.length ? "outline" : "primary"}>
                  <Link href={`/adm/historia/secoes/nova?tipo=${type}`}>
                    <Plus /> Adicionar
                  </Link>
                </Button>
              </CardHeader>
              {items.length ? (
                <ul className="divide-y divide-border">
                  {items.map((s, i) => (
                    <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {type === "VIDEO" && <Video className="size-4 text-navy-600" aria-hidden="true" />}
                          <Link href={`/adm/historia/secoes/${s.id}`} className="font-semibold text-ink hover:text-navy-700">
                            {s.title}
                          </Link>
                          {s.published ? <Badge tone="success">Publicada</Badge> : <Badge>Rascunho</Badge>}
                          {s.isDemo && <DemoBadge />}
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-muted">
                          {type === "VIDEO" ? s.mediaUrl : richDocToText(s.body) || "—"}
                        </p>
                        <p className="mt-1 text-xs text-muted">Atualizada em {formatDateTime(s.updatedAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <form action={moveSectionAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="direction" value="up" />
                          <Button type="submit" variant="ghost" size="icon" disabled={i === 0} aria-label={`Mover "${s.title}" para cima`}>
                            <ArrowUp />
                          </Button>
                        </form>
                        <form action={moveSectionAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="direction" value="down" />
                          <Button type="submit" variant="ghost" size="icon" disabled={i === items.length - 1} aria-label={`Mover "${s.title}" para baixo`}>
                            <ArrowDown />
                          </Button>
                        </form>
                        <ConfirmAction
                          trigger={s.published ? <EyeOff /> : <Eye />}
                          triggerLabel={s.published ? "Despublicar" : "Publicar"}
                          triggerVariant="ghost"
                          title={s.published ? `Despublicar "${s.title}"?` : `Publicar "${s.title}"?`}
                          description={
                            s.published
                              ? "A seção deixa de aparecer para os colaboradores, mas continua salva."
                              : "A seção passará a aparecer para todos os colaboradores em “Nossa história”."
                          }
                          confirmLabel={s.published ? "Despublicar" : "Publicar"}
                          confirmVariant="navy"
                          action={publishSectionAction}
                          hidden={{ id: s.id, published: String(!s.published) }}
                        />
                        <Button asChild variant="ghost" size="icon" aria-label={`Editar "${s.title}"`}>
                          <Link href={`/adm/historia/secoes/${s.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <ConfirmAction
                          trigger={<Trash2 />}
                          triggerLabel="Excluir"
                          triggerVariant="ghost"
                          title={`Excluir "${s.title}"?`}
                          description="A seção será excluída definitivamente. Essa ação não pode ser desfeita."
                          confirmLabel="Excluir"
                          action={deleteSectionAction}
                          hidden={{ id: s.id }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Landmark} title="Nenhum conteúdo cadastrado" className="py-8" />
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
