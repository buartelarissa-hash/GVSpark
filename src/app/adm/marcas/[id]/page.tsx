import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Library, Link2, Trash2, Youtube } from "lucide-react";
import { requirePagePermission } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { formatBytes } from "@/lib/file-validation";
import { BrandForm } from "../brand-form";
import { MaterialDialog } from "../material-dialog";
import { removeMaterialAction } from "../actions";

export const metadata = { title: "Marca parceira" };

export default async function BrandAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("courses.manage");
  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    include: { materials: { orderBy: { order: "asc" }, include: { file: { select: { originalName: true, sizeBytes: true } } } } },
  });
  if (!brand) notFound();
  const icon = { FILE: FileText, LINK: Link2, VIDEO: Youtube } as const;
  return (
    <>
      <Link href="/adm/marcas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> Marcas parceiras
      </Link>
      <PageHeader
        title={brand.name}
        actions={
          <Button asChild variant="outline">
            <Link href={`/academy/marcas/${brand.slug}`} target="_blank">
              <ExternalLink /> Ver como colaborador
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardContent className="p-6">
            <BrandForm
              brand={{
                id: brand.id,
                name: brand.name,
                summary: brand.summary,
                presentation: brand.presentation,
                website: brand.website,
                productLines: brand.productLines,
                logoUrl: brand.logoUrl,
                active: brand.active,
              }}
            />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle>Materiais técnicos</CardTitle>
              <CardDescription>{brand.materials.length} cadastrados</CardDescription>
            </div>
            <MaterialDialog brandId={brand.id} />
          </CardHeader>
          {brand.materials.length ? (
            <ul className="divide-y divide-border">
              {brand.materials.map((m) => {
                const Icon = icon[m.kind];
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <Icon className="size-4 shrink-0 text-navy-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.title}</p>
                      <p className="truncate text-xs text-muted">{m.file ? `${m.file.originalName} · ${formatBytes(m.file.sizeBytes)}` : m.url}</p>
                    </div>
                    <ConfirmAction
                      trigger={<Trash2 />}
                      triggerLabel={`Remover ${m.title}`}
                      triggerVariant="ghost"
                      title={`Remover "${m.title}"?`}
                      description="O material deixará de aparecer na página da marca."
                      confirmLabel="Remover"
                      action={removeMaterialAction}
                      hidden={{ id: m.id }}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Library} title="Nenhum material" className="py-8" />
          )}
        </Card>
      </div>
    </>
  );
}
