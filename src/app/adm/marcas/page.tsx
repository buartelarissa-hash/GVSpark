import Link from "next/link";
import { Handshake, Plus } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { listBrands } from "@/server/services/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Marcas parceiras" };

export default async function BrandsAdminPage() {
  await requirePagePermission("courses.manage");
  const brands = await listBrands(false);
  return (
    <>
      <PageHeader
        title="Marcas parceiras"
        description="Logos, apresentação, categorias de produtos e materiais técnicos das marcas."
        actions={
          <Button asChild>
            <Link href="/adm/marcas/nova">
              <Plus /> Nova marca
            </Link>
          </Button>
        }
      />
      {brands.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/adm/marcas/${b.id}`} className={`block h-full rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)] transition hover:border-spark-500 ${b.active ? "" : "opacity-60"}`}>
                <div className="flex h-16 items-center justify-center rounded-lg bg-surface">
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt={`Logo ${b.name}`} className="max-h-12 max-w-[80%] object-contain" />
                  ) : (
                    <span className="text-lg font-extrabold tracking-tight text-navy-900">{b.name}</span>
                  )}
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2 font-semibold">
                  {b.name} {!b.active && <Badge tone="danger">Inativa</Badge>} {b.isDemo && <DemoBadge />}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {b._count.courses} cursos publicados · {b._count.materials} materiais
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState icon={Handshake} title="Nenhuma marca cadastrada" />
        </Card>
      )}
    </>
  );
}
