"use client";

import * as React from "react";
import { Building2, ChevronDown, ChevronRight, LayoutList, Minus, Network, Plus, Search, UserRound, UserX, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildTree, type TreeNode } from "@/lib/org-tree";

export type OrgNode = {
  id: string;
  parentId: string | null;
  order: number;
  title: string;
  responsibilities: string | null;
  department: string | null;
  isDemo: boolean;
  person: { name: string; avatarUrl: string | null } | null;
};

type N = TreeNode<OrgNode>;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function OrgChart({ nodes }: { nodes: OrgNode[] }) {
  const tree = React.useMemo(() => buildTree(nodes), [nodes]);
  const byId = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [view, setView] = React.useState<"tree" | "list">("tree");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<OrgNode | null>(null);

  // Expandidos: por padrão, os dois primeiros níveis.
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    tree.forEach((r) => {
      s.add(r.id);
      r.children.forEach((c) => s.add(c.id));
    });
    return s;
  });

  React.useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);

  const matches = React.useMemo(() => {
    const q = norm(query.trim());
    if (!q) return null;
    return new Set(
      nodes
        .filter((n) => [n.title, n.person?.name, n.department].some((v) => v && norm(v).includes(q)))
        .map((n) => n.id),
    );
  }, [query, nodes]);

  // Durante a busca, expande o caminho até cada resultado.
  const visibleExpanded = React.useMemo(() => {
    if (!matches) return expanded;
    const s = new Set(expanded);
    for (const id of matches) {
      let p = byId.get(id)?.parentId;
      while (p) {
        s.add(p);
        p = byId.get(p)?.parentId ?? null;
      }
    }
    return s;
  }, [matches, expanded, byId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const expandAll = () => setExpanded(new Set(nodes.map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set(tree.map((r) => r.id)));

  const managerOf = (n: OrgNode) => {
    const p = n.parentId ? byId.get(n.parentId) : undefined;
    return p ? { title: p.title, name: p.person?.name ?? null } : null;
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cargo ou setor"
            className="pl-9 pr-9"
            aria-label="Buscar no organograma"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink" aria-label="Limpar busca">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {matches && (
            <span className="text-sm text-muted" role="status">
              {matches.size} {matches.size === 1 ? "resultado" : "resultados"}
            </span>
          )}
          <button type="button" onClick={expandAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-navy-50">
            <Plus className="size-3.5" /> Expandir tudo
          </button>
          <button type="button" onClick={collapseAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-navy-50">
            <Minus className="size-3.5" /> Recolher
          </button>
          <div className="flex rounded-lg border border-border bg-white p-0.5" role="group" aria-label="Modo de visualização">
            {(
              [
                ["tree", Network, "Organograma"],
                ["list", LayoutList, "Lista"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold",
                  view === v ? "bg-navy-900 text-white" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "tree" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="org-tree mx-auto w-max min-w-full">
            <ul>
              {tree.map((n) => (
                <TreeItem key={n.id} node={n} expanded={visibleExpanded} matches={matches} onToggle={toggle} onSelect={setSelected} />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white py-2 shadow-[var(--shadow-card)]">
          <ul role="tree" aria-label="Organograma">
            {tree.map((n) => (
              <ListItem key={n.id} node={n} depth={0} expanded={visibleExpanded} matches={matches} onToggle={toggle} onSelect={setSelected} />
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        {selected && (
          <DialogContent title={selected.person?.name ?? `${selected.title} (vaga)`} description={selected.title}>
            <div className="flex items-center gap-4">
              {selected.person ? (
                <Avatar name={selected.person.name} src={selected.person.avatarUrl} size="xl" />
              ) : (
                <VacantIcon className="size-20" />
              )}
              <dl className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted">Cargo:</dt>
                  <dd className="font-medium">{selected.title}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Setor:</dt>
                  <dd className="font-medium">{selected.department ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Responde a:</dt>
                  <dd className="font-medium">
                    {(() => {
                      const m = managerOf(selected);
                      return m ? (m.name ? `${m.name} (${m.title})` : `${m.title} (vaga)`) : "—";
                    })()}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-navy-900">Responsabilidades</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted">
                {selected.responsibilities || "Responsabilidades ainda não descritas."}
              </p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function VacantIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-navy-600/40 bg-navy-50 text-navy-600", className)}>
      <UserX className="size-1/2" aria-hidden="true" />
    </span>
  );
}

type ItemProps = {
  node: N;
  expanded: Set<string>;
  matches: Set<string> | null;
  onToggle: (id: string) => void;
  onSelect: (n: OrgNode) => void;
};

function TreeItem({ node, expanded, matches, onToggle, onSelect }: ItemProps) {
  const open = expanded.has(node.id);
  const hit = matches?.has(node.id);
  const dim = matches && !hit;
  return (
    <li>
      <div className="org-card-wrap relative flex flex-col items-center">
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={cn(
            "flex w-48 flex-col items-center rounded-xl border bg-white px-3 pb-3 pt-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-spark-500 hover:shadow-md",
            hit ? "border-spark-500 ring-2 ring-spark-500/50" : "border-border",
            dim && "opacity-40",
          )}
        >
          {node.person ? <Avatar name={node.person.name} src={node.person.avatarUrl} size="lg" /> : <VacantIcon className="size-16" />}
          <span className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{node.person?.name ?? "Posição vaga"}</span>
          <span className="mt-0.5 line-clamp-2 text-xs font-medium text-navy-600">{node.title}</span>
          {node.department && <span className="mt-1 line-clamp-1 text-[0.7rem] text-muted">{node.department}</span>}
          {node.isDemo && <span className="mt-1"><DemoBadge /></span>}
        </button>
        {node.children.length > 0 && (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={open}
            aria-label={open ? `Recolher equipe de ${node.title}` : `Expandir equipe de ${node.title}`}
            className="relative z-10 -mt-3 inline-flex h-6 items-center gap-1 rounded-full border border-border bg-white px-2 text-[0.7rem] font-semibold text-navy-700 shadow-sm hover:border-spark-500"
          >
            {open ? <Minus className="size-3" /> : <Plus className="size-3" />}
            {node.children.length}
          </button>
        )}
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <TreeItem key={c.id} node={c} expanded={expanded} matches={matches} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ListItem({ node, depth, expanded, matches, onToggle, onSelect }: ItemProps & { depth: number }) {
  const open = expanded.has(node.id);
  const hit = matches?.has(node.id);
  return (
    <li role="treeitem" aria-expanded={node.children.length ? open : undefined} aria-selected={false}>
      <div className={cn("flex items-center gap-2 py-1.5 pr-3", hit && "bg-spark-50")} style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
        {node.children.length > 0 ? (
          <button type="button" onClick={() => onToggle(node.id)} className="rounded p-1 text-muted hover:bg-navy-50 hover:text-ink" aria-label={open ? "Recolher" : "Expandir"}>
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-6" aria-hidden="true" />
        )}
        <button type="button" onClick={() => onSelect(node)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left hover:bg-navy-50">
          {node.person ? <Avatar name={node.person.name} src={node.person.avatarUrl} size="sm" /> : <VacantIcon className="size-8" />}
          <span className="min-w-0">
            <span className="flex items-center gap-2 truncate text-sm font-semibold">
              {node.person?.name ?? "Posição vaga"}
              {!node.person && <Badge tone="warning">Vaga</Badge>}
            </span>
            <span className="flex items-center gap-1 truncate text-xs text-muted">
              <UserRound className="size-3 shrink-0" aria-hidden="true" /> {node.title}
              {node.department && (
                <>
                  <Building2 className="ml-2 size-3 shrink-0" aria-hidden="true" /> {node.department}
                </>
              )}
            </span>
          </span>
        </button>
      </div>
      {open && node.children.length > 0 && (
        <ul role="group">
          {node.children.map((c) => (
            <ListItem key={c.id} node={c} depth={depth + 1} expanded={expanded} matches={matches} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
