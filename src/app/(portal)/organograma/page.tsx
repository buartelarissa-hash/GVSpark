import { Network } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listOrgPositions } from "@/server/services/org-chart";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrgChart } from "./org-chart";

export const metadata = { title: "Organograma" };

export default async function OrgChartPage() {
  await requireUser();
  const positions = await listOrgPositions(false);
  // Ocupante desativado aparece como posição vaga.
  const nodes = positions.map((p) => ({
    id: p.id,
    parentId: p.parentId,
    order: p.order,
    title: p.title,
    responsibilities: p.responsibilities,
    department: p.department?.name ?? null,
    isDemo: p.isDemo,
    person: p.user && p.user.status === "ACTIVE" ? { name: p.user.name, avatarUrl: p.user.avatarUrl } : null,
  }));

  return (
    <>
      <PageHeader
        title="Organograma"
        description="Conheça a estrutura da Gigavale. Clique em uma pessoa para ver cargo, setor, gestor e responsabilidades."
      />
      {nodes.length ? (
        <OrgChart nodes={nodes} />
      ) : (
        <Card>
          <EmptyState icon={Network} title="O organograma ainda está sendo montado" description="Em breve você poderá conhecer a estrutura da empresa por aqui." />
        </Card>
      )}
    </>
  );
}
