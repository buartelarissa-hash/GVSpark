import Link from "next/link";
import { ChevronRight, Rocket } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listTracks } from "@/server/services/onboarding";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackDialog } from "./dialogs";

export const metadata = { title: "Trilhas de integração" };

export default async function TracksPage() {
  await requirePagePermission("content.manage");
  const [tracks, positions] = await Promise.all([
    listTracks(),
    db.position.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, department: { select: { name: true } } } }),
  ]);
  const posOpts = positions.map((p) => ({ id: p.id, label: p.department ? `${p.title} (${p.department.name})` : p.title }));
  const hasDefault = tracks.some((t) => t.isDefault && t.active);

  return (
    <>
      <PageHeader
        title="Trilhas de integração"
        description="Jornada guiada dos novos colaboradores. Cada cargo pode ter uma trilha própria; quem não tem segue a trilha padrão."
        actions={<TrackDialog positions={posOpts} />}
      />
      {!hasDefault && tracks.length > 0 && (
        <p className="mb-4 rounded-lg border border-warning/20 bg-warning-bg px-4 py-3 text-sm text-warning">
          Nenhuma trilha ativa está marcada como padrão. Colaboradores sem trilha do cargo não verão a integração.
        </p>
      )}
      <Card>
        {tracks.length ? (
          <ul className="divide-y divide-border">
            {tracks.map((t) => (
              <li key={t.id}>
                <Link href={`/adm/integracao/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-navy-50/50">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <Rocket className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.name}
                      {t.isDefault && <Badge tone="spark">Padrão</Badge>}
                      {!t.active && <Badge tone="danger">Inativa</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {t.position ? `Cargo: ${t.position.title}` : "Todos os cargos sem trilha própria"} · {t._count.steps} etapas
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Rocket} title="Nenhuma trilha criada" description="Crie a trilha padrão para começar. Você pode usar as 7 etapas sugeridas." action={<TrackDialog positions={posOpts} />} />
        )}
      </Card>
    </>
  );
}
