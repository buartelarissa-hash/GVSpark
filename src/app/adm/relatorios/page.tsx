import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Relatórios" };

export default async function Page() {
  await requirePagePermission("reports.view");
  return (
    <ComingSoon
      title="Relatórios"
      description="Indicadores de aprendizagem e desenvolvimento."
      phase={6}
      icon={BarChart3}
      features={[
        "Conclusão de treinamentos",
        "Desempenho em avaliações",
        "Exportação de dados",
        "Auditoria de ações",
      ]}
    />
  );
}
