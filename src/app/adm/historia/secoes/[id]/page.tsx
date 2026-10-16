import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/auth/current-user";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { SECTION_LABEL } from "@/lib/company-sections";
import { SectionForm } from "../section-form";

export const metadata = { title: "Editar seção" };

export default async function EditSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criada?: string }>;
}) {
  await requirePagePermission("content.manage");
  const { id } = await params;
  const { criada } = await searchParams;
  const section = await db.companySection.findUnique({ where: { id } });
  if (!section) notFound();
  return (
    <>
      <PageHeader eyebrow={`História e cultura · ${SECTION_LABEL[section.type]}`} title={section.title} />
      {criada && <Alert tone="success" className="mb-4">Seção criada.</Alert>}
      {section.isDemo && (
        <Alert tone="warning" className="mb-4" title="Conteúdo demonstrativo">
          Substitua este texto pelo conteúdo oficial. Ao salvar, o selo “Demonstrativo” é removido.
        </Alert>
      )}
      <Card>
        <CardContent className="p-6">
          <SectionForm type={section.type} section={section} />
        </CardContent>
      </Card>
    </>
  );
}
