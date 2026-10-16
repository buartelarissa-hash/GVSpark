import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Meu histórico acadêmico" };

export default function Page() {
  return (
    <ComingSoon
      title="Meu histórico acadêmico"
      description="Cursos, avaliações e resultados liberados."
      phase={4}
      icon={ClipboardList}
      features={[
        "Cursos e avaliações realizados",
        "Notas liberadas e situação (aprovado/reprovado)",
        "Número de tentativas",
        "Gráfico de evolução das notas",
      ]}
    />
  );
}
