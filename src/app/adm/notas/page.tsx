import { History } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Histórico de notas" };

export default async function Page() {
  await requirePagePermission("grades.view");
  return (
    <ComingSoon
      title="Histórico de notas"
      description="Consulte notas e desempenho por colaborador e curso."
      phase={4}
      icon={History}
      features={[
        "Todas as tentativas de cada colaborador",
        "Média e taxa de aprovação por curso",
        "Questões com maior índice de erro",
        "Exportação de relatórios",
      ]}
    />
  );
}
