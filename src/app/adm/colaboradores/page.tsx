import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import type { Role, UserStatus } from "@prisma/client";
import { requirePagePermission } from "@/server/auth/current-user";
import { listUsers } from "@/server/services/users";
import { db } from "@/server/db";
import { hasPermission } from "@/server/permissions/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_LABELS, ROLES, STATUS_LABELS } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Colaboradores" };

type SP = { q?: string; role?: string; status?: string; departamento?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePagePermission("users.view");
  const sp = await searchParams;
  const role = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined;
  const status = sp.status === "ACTIVE" || sp.status === "INACTIVE" ? (sp.status as UserStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;

  const [result, departments] = await Promise.all([
    listUsers(actor, { q, role, status, departmentId: sp.departamento || undefined, page }),
    db.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const canManage = hasPermission(actor.role, "users.manage");

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (sp.departamento) params.set("departamento", sp.departamento);
    params.set("page", String(p));
    return `/adm/colaboradores?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description={actor.role === "GESTOR" ? "Colaboradores da sua equipe." : "Cadastro, perfis de acesso e situação dos colaboradores."}
        actions={
          canManage && (
            <Button asChild>
              <Link href="/adm/colaboradores/novo">
                <UserPlus /> Novo colaborador
              </Link>
            </Button>
          )
        }
      />

      <Card>
        <form className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input name="q" defaultValue={q} placeholder="Buscar por nome, usuário, e-mail ou matrícula" className="pl-9" aria-label="Buscar" />
          </div>
          <Select name="departamento" defaultValue={sp.departamento ?? ""} aria-label="Departamento">
            <option value="">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Select name="role" defaultValue={role ?? ""} aria-label="Perfil">
            <option value="">Todos os perfis</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={status ?? ""} aria-label="Situação">
            <option value="">Todas as situações</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </Select>
          <Button type="submit" variant="navy">Filtrar</Button>
        </form>

        {result.items.length ? (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Colaborador</TH>
                  <TH className="hidden md:table-cell">Cargo / departamento</TH>
                  <TH>Perfil</TH>
                  <TH>Situação</TH>
                  <TH className="hidden lg:table-cell">Último acesso</TH>
                </tr>
              </THead>
              <TBody>
                {result.items.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <Link href={`/adm/colaboradores/${u.id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-navy-700">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate">{u.name}</span>
                            {u.isDemo && <DemoBadge />}
                          </span>
                          <span className="block truncate text-xs font-normal text-muted">{u.username}</span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span className="block">{u.position?.title ?? "—"}</span>
                      <span className="block text-xs text-muted">{u.department?.name ?? "—"}</span>
                    </TD>
                    <TD><Badge tone={u.role === "ADMIN" ? "navy" : "neutral"}>{ROLE_LABELS[u.role]}</Badge></TD>
                    <TD><Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{STATUS_LABELS[u.status]}</Badge></TD>
                    <TD className="hidden text-muted lg:table-cell">{formatDateTime(u.lastLoginAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination page={result.page} pageCount={result.pageCount} total={result.total} hrefFor={hrefFor} />
          </>
        ) : (
          <EmptyState icon={Users} title="Nenhum colaborador encontrado" description="Ajuste os filtros ou cadastre um novo colaborador." />
        )}
      </Card>
    </>
  );
}
