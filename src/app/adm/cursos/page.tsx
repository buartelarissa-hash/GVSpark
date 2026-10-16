import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";
import type { CourseStatus } from "@prisma/client";
import { requireAnyPagePermission } from "@/server/auth/current-user";
import { listCoursesForAdmin } from "@/server/services/courses";
import { hasPermission } from "@/server/permissions/permissions";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { COURSE_STATUS } from "@/lib/academy-labels";
import { formatDate } from "@/lib/format";
import { AcademyTabs } from "./tabs";

export const metadata = { title: "Cursos e treinamentos" };

type SP = { q?: string; status?: string; categoria?: string; marca?: string };

export default async function CoursesAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  const sp = await searchParams;
  const isAdmin = hasPermission(actor.role, "courses.manage");
  const status = sp.status && sp.status in COURSE_STATUS ? (sp.status as CourseStatus) : undefined;
  const [courses, categories, brands] = await Promise.all([
    listCoursesForAdmin(actor, { q: sp.q?.trim().slice(0, 100) || undefined, status, categoryId: sp.categoria || undefined, brandId: sp.marca || undefined }),
    db.courseCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Cursos e treinamentos"
        description={isAdmin ? "Crie cursos, organize módulos e aulas, publique e atribua aos colaboradores." : "Cursos sob sua responsabilidade."}
        actions={
          <Button asChild>
            <Link href="/adm/cursos/novo">
              <Plus /> Novo curso
            </Link>
          </Button>
        }
      />
      <AcademyTabs admin={isAdmin} />
      <Card>
        <form role="search" className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input name="q" defaultValue={sp.q} placeholder="Buscar curso" className="pl-9" aria-label="Buscar curso" />
          </div>
          <Select name="status" defaultValue={status ?? ""} aria-label="Status">
            <option value="">Todos os status</option>
            {Object.entries(COURSE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Select name="categoria" defaultValue={sp.categoria ?? ""} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select name="marca" defaultValue={sp.marca ?? ""} aria-label="Marca">
            <option value="">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="navy">Filtrar</Button>
        </form>
        {courses.length ? (
          <Table>
            <THead>
              <tr>
                <TH>Curso</TH>
                <TH className="hidden md:table-cell">Categoria / marca</TH>
                <TH className="hidden lg:table-cell">Instrutor</TH>
                <TH className="text-right">Módulos</TH>
                <TH className="text-right">Matrículas</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {courses.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/adm/cursos/${c.id}`} className="flex items-center gap-3 font-semibold hover:text-navy-700">
                      {c.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.coverUrl} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-600">
                          <BookOpen className="size-4" aria-hidden="true" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          {c.title} {c.mandatory && <Badge tone="spark">Obrigatório</Badge>} {c.isDemo && <DemoBadge />}
                        </span>
                        <span className="block text-xs font-normal text-muted">Atualizado em {formatDate(c.updatedAt)}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="hidden text-muted md:table-cell">{[c.category?.name, c.brand?.name].filter(Boolean).join(" · ") || "—"}</TD>
                  <TD className="hidden text-muted lg:table-cell">{c.instructor?.name ?? "—"}</TD>
                  <TD className="text-right tabular-nums">{c._count.modules}</TD>
                  <TD className="text-right tabular-nums">{c._count.enrollments}</TD>
                  <TD><Badge tone={COURSE_STATUS[c.status].tone}>{COURSE_STATUS[c.status].label}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={BookOpen} title="Nenhum curso encontrado" description="Crie o primeiro curso da GV Spark Academy." />
        )}
      </Card>
    </>
  );
}
