import { ClipboardCheck } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Avaliações e correções" };

export default async function Page() {
  await requirePagePermission("assessments.grade");
  return (
    <ComingSoon
      title="Avaliações e correções"
      description="Configure provas, corrija e libere resultados."
      phase={4}
      icon={ClipboardCheck}
      features={[
        "Configuração de nota mínima, tempo e tentativas",
        "Correção de questões abertas",
        "Ajuste de nota com justificativa",
        "Liberação de resultado e autorização de nova tentativa",
      ]}
    />
  );
}
