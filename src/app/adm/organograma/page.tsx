import { ArrowDown, ArrowUp, ArchiveRestore, ExternalLink, Network, UserX, Archive } from "lucide-react";
import Link from "next/link";
import { requirePagePermission } from "@/server/auth/current-user";
import { listOrgPositions } from "@/server/services/org-chart";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { buildTree, descendantIds, type TreeNode } from "@/lib/org-tree";
import { OrgDialog } from "./org-dialog";
import { ImportButton } from "./import-button";
import { deactivateOrgPositionAction, moveOrgPositionAction, reactivateOrgPositionAction } from "./actions";

export const metadata = { title: "Organograma" };

type Node = Awaited<ReturnType<typeof listOrgPositions>>[number];

export default async function OrgAdminPage() {
  await requirePagePermission("org.manage");
  const [all, departments, users] = await Promise.all([
    listOrgPositions(true),
    db.department.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: { select: { title: true } } },
    }),
  ]);
  const active = all.filter((n) => n.active);
  const inactive = all.filter((n) => !n.active);
  const tree = buildTree(active);
  const depOpts = departments.map((d) => ({ id: d.id, label: d.name }));
  const userOpts = users.map((u) => ({ id: u.id, label: u.position ? `${u.name} — ${u.position.title}` : u.name }));
  const label = (n: Node) => (n.user ? `${n.title} (${n.user.name})` : `${n.title} (vaga)`);
  const parentOptsFor = (id?: string) => {
    const blocked = id ? descendantIds(active, id) : new Set<string>();
    return active.filter((n) => !blocked.has(n.id)).map((n) => ({ id: n.id, label: label(n) }));
  };

  function Row({ node, depth, index, siblings }: { node: TreeNode<Node>; depth: number; index: number; siblings: number }) {
    return (
      <>
        <li className="flex items-center gap-3 py-2.5 pr-4" style={{ paddingLeft: `${1.25 + depth * 1.75}rem` }}>
          {depth > 0 && <span className="h-px w-3 shrink-0 bg-border" aria-hidden="true" />}
          {node.user ? (
            <Avatar name={node.user.name} src={node.user.avatarUrl} size="sm" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-navy-600/40 text-navy-600">
              <UserX className="size-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {node.title}
              {!node.user && <Badge tone="warning">Vaga</Badge>}
              {node.isDemo && <DemoBadge />}
            </p>
            <p className="truncate text-xs text-muted">
              {[node.user?.name, node.department?.name].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <form action={moveOrgPositionAction}>
              <input type="hidden" name="id" value={node.id} />
              <input type="hidden" name="direction" value="up" />
              <Button type="submit" variant="ghost" size="icon" disabled={index === 0} aria-label={`Mover ${node.title} para cima`}>
                <ArrowUp />
              </Button>
            </form>
            <form action={moveOrgPositionAction}>
              <input type="hidden" name="id" value={node.id} />
              <input type="hidden" name="direction" value="down" />
              <Button type="submit" variant="ghost" size="icon" disabled={index === siblings - 1} aria-label={`Mover ${node.title} para baixo`}>
                <ArrowDown />
              </Button>
            </form>
            <OrgDialog variant="child" parentId={node.id} parents={parentOptsFor()} departments={depOpts} users={userOpts} />
            <OrgDialog
              variant="edit"
              node={node}
              parents={parentOptsFor(node.id)}
              departments={depOpts}
              users={userOpts}
            />
            <ConfirmAction
              trigger={<Archive />}
              triggerLabel={`Desativar ${node.title}`}
              triggerVariant="ghost"
              title={`Desativar a posição "${node.title}"?`}
              description={
                node.children.length
                  ? `As ${node.children.length} posições subordinadas passarão a responder à posição acima desta. A posição pode ser reativada depois.`
                  : "A posição deixa de aparecer no organograma e pode ser reativada depois."
              }
              confirmLabel="Desativar"
              action={deactivateOrgPositionAction}
              hidden={{ id: node.id }}
            />
          </div>
        </li>
        {node.children.map((c, i) => (
          <Row key={c.id} node={c} depth={depth + 1} index={i} siblings={node.children.length} />
        ))}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Organograma"
        description="Estrutura exibida aos colaboradores. Cada posição pode estar ocupada por um colaborador ou vaga."
        actions={
          <Button asChild variant="outline">
            <Link href="/organograma" target="_blank">
              <ExternalLink /> Ver como colaborador
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Estrutura</CardTitle>
            <CardDescription>{active.length} posições ativas</CardDescription>
          </div>
          <div className="flex flex-wrap items-start justify-end gap-2">
            <ImportButton />
            <OrgDialog parents={parentOptsFor()} departments={depOpts} users={userOpts} />
          </div>
        </CardHeader>
        {tree.length ? (
          <ul className="divide-y divide-border/60">
            {tree.map((n, i) => (
              <Row key={n.id} node={n} depth={0} index={i} siblings={tree.length} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Network}
            title="Organograma vazio"
            description="Crie as posições manualmente ou use “Importar dos cadastros” para montar a estrutura a partir dos gestores definidos em cada colaborador."
          />
        )}
      </Card>

      {inactive.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div>
              <CardTitle>Posições desativadas</CardTitle>
              <CardDescription>Ao reativar, a posição volta ao topo do organograma; ajuste a posição superior em seguida.</CardDescription>
            </div>
          </CardHeader>
          <ul className="divide-y divide-border">
            {inactive.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-5 py-3 opacity-80">
                <p className="flex-1 text-sm">
                  <span className="font-semibold">{n.title}</span>
                  <span className="text-muted">{n.user ? ` · ${n.user.name}` : " · vaga"}</span>
                </p>
                <ConfirmAction
                  trigger={<><ArchiveRestore /> Reativar</>}
                  title={`Reativar "${n.title}"?`}
                  description="A posição volta a aparecer no organograma, no topo da estrutura."
                  confirmLabel="Reativar"
                  confirmVariant="navy"
                  action={reactivateOrgPositionAction}
                  hidden={{ id: n.id }}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
