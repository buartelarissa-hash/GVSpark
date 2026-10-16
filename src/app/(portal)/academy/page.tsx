import Link from "next/link";
import { GraduationCap, Handshake, Search } from "lucide-react";
import type { CourseLevel } from "@prisma/client";
import { requireUser } from "@/server/auth/current-user";
import { catalogForUser, myEnrollments } from "@/server/services/learning";
import { listCategories } from "@/server/services/catalog";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TabsNav } from "@/components/ui/tabs-nav";
import { CourseCard } from "@/components/academy/course-card";
import { CategoryIcon } from "@/components/content/category-icon";
import { COURSE_LEVEL } from "@/lib/academy-labels";
import { cn } from "@/lib/utils";

export const metadata = { title: "GV Spark Academy" };

type SP = { q?: string; categoria?: string; marca?: string; nivel?: string };

export default async function AcademyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const level = sp.nivel && sp.nivel in COURSE_LEVEL ? (sp.nivel as CourseLevel) : undefined;
  const [courses, categories, brands, mine] = await Promise.all([
    catalogForUser(user, { q: sp.q?.trim().slice(0, 100) || undefined, categoryId: sp.categoria || undefined, brandId: sp.marca || undefined, level }),
    listCategories(false),
    db.brand.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    myEnrollments(user),
  ]);
  const filtering = !!(sp.q || sp.categoria || sp.marca || level);
  const pending = mine.filter((e) => e.status !== "COMPLETED");
  const href = (p: Partial<SP>) => {
    const params = new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/academy${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-8 text-white sm:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-navy-700/70" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-spark-500">GV Spark Academy</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Aprenda, aplique, desperte seu potencial.</h1>
            <p className="mt-2 max-w-xl text-navy-100/85">Treinamentos técnicos de produtos, marcas parceiras e técnicas de venda.</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-3xl font-bold tabular-nums text-spark-500">{pending.length}</p>
              <p className="text-navy-100/80">em andamento ou a fazer</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums text-spark-500">{mine.length - pending.length}</p>
              <p className="text-navy-100/80">concluídos</p>
            </div>
          </div>
        </div>
      </section>

      <TabsNav tabs={[{ href: "/academy", label: "Catálogo", exact: true }, { href: "/academy/meus-cursos", label: `Meus cursos (${mine.length})` }, { href: "/academy/marcas", label: "Marcas parceiras" }]} />

      {!filtering && categories.length > 0 && (
        <section aria-labelledby="tec">
          <h2 id="tec" className="mb-3 text-lg font-bold text-navy-900">Conhecimento técnico</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={href({ categoria: c.id })}
                  className="flex h-full flex-col items-center gap-2 rounded-xl border border-border bg-white px-3 py-4 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-spark-500"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{c.name}</span>
                  <span className="text-xs text-muted">{c._count.courses} {c._count.courses === 1 ? "curso" : "cursos"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cat">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="cat" className="text-lg font-bold text-navy-900">
            {filtering ? "Resultados" : "Todos os cursos"} <span className="text-sm font-medium text-muted">({courses.length})</span>
          </h2>
          <Link href="/academy/marcas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
            <Handshake className="size-4" aria-hidden="true" /> Ver marcas parceiras
          </Link>
        </div>
        <form role="search" className="mb-5 grid gap-3 rounded-xl border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input name="q" defaultValue={sp.q} placeholder="Buscar cursos" className="pl-9" aria-label="Buscar cursos" />
          </div>
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
          <Select name="nivel" defaultValue={level ?? ""} aria-label="Nível">
            <option value="">Todos os níveis</option>
            {Object.entries(COURSE_LEVEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" variant="navy" className="flex-1">Filtrar</Button>
            {filtering && (
              <Button asChild variant="ghost">
                <Link href="/academy">Limpar</Link>
              </Button>
            )}
          </div>
        </form>
        {courses.length ? (
          <ul className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
            {courses.map((c) => (
              <li key={c.id}>
                <CourseCard c={c} />
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <EmptyState
              icon={GraduationCap}
              title={filtering ? "Nenhum curso encontrado" : "O catálogo da GV Spark Academy está sendo preparado"}
              description={filtering ? "Tente outros filtros." : "Os cursos publicados aparecerão aqui."}
            />
          </Card>
        )}
      </section>
    </div>
  );
}
