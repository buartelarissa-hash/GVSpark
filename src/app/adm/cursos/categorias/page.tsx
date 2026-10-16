import { Shapes } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listCategories } from "@/server/services/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/components/content/category-icon";
import { AcademyTabs } from "../tabs";
import { CategoryDialog } from "./category-dialog";

export const metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  await requirePagePermission("courses.manage");
  const categories = await listCategories();
  return (
    <>
      <PageHeader title="Cursos e treinamentos" description="Categorias de conhecimento técnico usadas no catálogo da Academy." />
      <AcademyTabs admin />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Categorias</CardTitle>
            <CardDescription>{categories.length} cadastradas</CardDescription>
          </div>
          <CategoryDialog />
        </CardHeader>
        {categories.length ? (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className={`flex items-center gap-4 px-5 py-3 ${c.active ? "" : "opacity-60"}`}>
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {c.name} {!c.active && <Badge tone="danger">Inativa</Badge>} {c.isDemo && <DemoBadge />}
                  </p>
                  <p className="text-sm text-muted">{c.description ?? "—"} · {c._count.courses} cursos publicados</p>
                </div>
                <CategoryDialog category={{ id: c.id, name: c.name, description: c.description, icon: c.icon, active: c.active }} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Shapes} title="Nenhuma categoria" />
        )}
      </Card>
    </>
  );
}
