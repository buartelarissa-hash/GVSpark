import { Check, Minus } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PERMISSIONS } from "@/server/permissions/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import { auditLabel } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";

export const metadata = { title: "Configurações e permissões" };

const palette = [
  { name: "Azul-marinho principal", token: "navy-900", hex: "#08234A", cls: "bg-navy-900" },
  { name: "Azul secundário", token: "navy-700", hex: "#153B69", cls: "bg-navy-700" },
  { name: "Amarelo destaque", token: "spark-500", hex: "#FFCA28", cls: "bg-spark-500" },
  { name: "Branco", token: "white", hex: "#FFFFFF", cls: "bg-white" },
  { name: "Cinza de fundo", token: "surface", hex: "#F5F7FA", cls: "bg-surface" },
];

const SCOPED: Partial<Record<(typeof ROLES)[number], string>> = {
  GESTOR:
    "Restrito à própria equipe (subordinados diretos e departamentos que chefia). Edita todos os dados dos membros, exceto o perfil de acesso, e não edita administradores.",
  INSTRUTOR: "Aplica provas e corrige/edita notas de todos os cursos. Gerencia apenas os cursos sob sua responsabilidade.",
};

export default async function SettingsPage() {
  await requirePagePermission("settings.manage");
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, entity: true, createdAt: true, ip: true, actor: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Configurações e permissões"
        description="Perfis de acesso, identidade visual e registro de auditoria."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="block">
            <CardTitle>Matriz de permissões</CardTitle>
            <CardDescription>
              As permissões são verificadas no servidor em todas as páginas e ações — esconder um botão na interface nunca é a única proteção.
            </CardDescription>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>Permissão</TH>
                {ROLES.map((r) => (
                  <TH key={r} className="text-center">{ROLE_LABELS[r]}</TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {PERMISSIONS.map((p) => (
                <TR key={p}>
                  <TD className="font-medium">{PERMISSION_LABELS[p]}</TD>
                  {ROLES.map((r) => (
                    <TD key={r} className="text-center">
                      {ROLE_PERMISSIONS[r].includes(p) ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Permitido" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted/50" aria-label="Não permitido" />
                      )}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
          <ul className="space-y-1 border-t border-border px-5 py-4 text-xs text-muted">
            {Object.entries(SCOPED).map(([role, note]) => (
              <li key={role}>
                <strong className="text-ink">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}:</strong> {note}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader className="block">
            <CardTitle>Identidade visual</CardTitle>
            <CardDescription>
              Paleta inicial definida como variáveis globais em <code className="rounded bg-navy-50 px-1">src/app/globals.css</code>. O logotipo provisório fica em{" "}
              <code className="rounded bg-navy-50 px-1">src/components/brand/logo.tsx</code>.
            </CardDescription>
          </CardHeader>
          <ul className="grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
            {palette.map((c) => (
              <li key={c.token} className="overflow-hidden rounded-lg border border-border">
                <div className={`h-16 ${c.cls}`} />
                <div className="p-3">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="font-mono text-xs text-muted">{c.hex}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader className="block">
            <CardTitle>Auditoria — ações recentes</CardTitle>
            <CardDescription>Últimos 30 registros de ações relevantes.</CardDescription>
          </CardHeader>
          {logs.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Quando</TH>
                  <TH>Quem</TH>
                  <TH>Ação</TH>
                  <TH className="hidden md:table-cell">Origem (IP)</TH>
                </tr>
              </THead>
              <TBody>
                {logs.map((l) => (
                  <TR key={l.id}>
                    <TD className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</TD>
                    <TD>{l.actor?.name ?? "Sistema"}</TD>
                    <TD>{auditLabel(l.action)}</TD>
                    <TD className="hidden font-mono text-xs text-muted md:table-cell">{l.ip ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={History} title="Nenhum registro ainda" />
          )}
        </Card>
      </div>
    </>
  );
}
