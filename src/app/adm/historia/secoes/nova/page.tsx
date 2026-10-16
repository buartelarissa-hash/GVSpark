import { notFound } from "next/navigation";
import type { CompanySectionType } from "@prisma/client";
import { requirePagePermission } from "@/server/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SECTION_TYPES } from "@/lib/company-sections";
import { SectionForm } from "../section-form";

export const metadata = { title: "Nova seção" };

export default async function NewSectionPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requirePagePermission("content.manage");
  const { tipo } = await searchParams;
  const def = SECTION_TYPES.find((s) => s.type === tipo);
  if (!def) notFound();
  return (
    <>
      <PageHeader eyebrow="História e cultura" title={`Nova seção · ${def.label}`} description={def.hint} />
      <Card>
        <CardContent className="p-6">
          <SectionForm type={def.type as CompanySectionType} />
        </CardContent>
      </Card>
    </>
  );
}
