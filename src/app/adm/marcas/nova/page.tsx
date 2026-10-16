import { requirePagePermission } from "@/server/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BrandForm } from "../brand-form";

export const metadata = { title: "Nova marca" };

export default async function NewBrandPage() {
  await requirePagePermission("courses.manage");
  return (
    <>
      <PageHeader title="Nova marca parceira" />
      <Card>
        <CardContent className="p-6">
          <BrandForm />
        </CardContent>
      </Card>
    </>
  );
}
