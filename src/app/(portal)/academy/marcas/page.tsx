import Link from "next/link";
import { Handshake } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listBrands } from "@/server/services/catalog";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TabsNav } from "@/components/ui/tabs-nav";

export const metadata = { title: "Marcas parceiras" };

export default async function BrandsPage() {
  await requireUser();
  const brands = await listBrands(true);
  return (
    <>
      <PageHeader eyebrow="GV Spark Academy" title="Marcas parceiras" description="Conheça as marcas que a Gigavale distribui, seus produtos, treinamentos e materiais técnicos." />
      <TabsNav tabs={[{ href: "/academy", label: "Catálogo", exact: true }, { href: "/academy/meus-cursos", label: "Meus cursos" }, { href: "/academy/marcas", label: "Marcas parceiras" }]} />
      {brands.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brands.map((b) => (
            <li key={b.id}>
              <Link href={`/academy/marcas/${b.slug}`} className="group flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-spark-500 hover:shadow-md">
                <div className="flex h-24 items-center justify-center rounded-lg bg-surface">
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logoUrl} alt={`Logo ${b.name}`} className="max-h-16 max-w-[80%] object-contain" />
                  ) : (
                    <span className="text-2xl font-extrabold tracking-tight text-navy-900">{b.name}</span>
                  )}
                </div>
                <h2 className="mt-4 flex flex-wrap items-center gap-2 font-semibold text-ink group-hover:text-navy-700">
                  {b.name} {b.isDemo && <DemoBadge />}
                </h2>
                {b.summary && <p className="mt-1 line-clamp-3 text-sm text-muted">{b.summary}</p>}
                <p className="mt-auto pt-3 text-xs font-semibold text-navy-600">
                  {b._count.courses} {b._count.courses === 1 ? "treinamento" : "treinamentos"} · {b._count.materials} materiais
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState icon={Handshake} title="As marcas parceiras ainda estão sendo cadastradas" />
        </Card>
      )}
    </>
  );
}
