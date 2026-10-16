import { Rocket } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Minha integração" };

export default function Page() {
  return (
    <ComingSoon
      title="Minha integração"
      description="Sua jornada guiada de boas-vindas na Gigavale."
      phase={2}
      icon={Rocket}
      features={[
        "Etapas: boas-vindas, história, valores, organograma",
        "Treinamentos obrigatórios da integração",
        "Avaliação de integração",
        "Barra de progresso da sua trilha",
      ]}
    />
  );
}
