import { Network } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Organograma" };

export default function Page() {
  return (
    <ComingSoon
      title="Organograma"
      description="Conheça a estrutura e as pessoas da Gigavale."
      phase={2}
      icon={Network}
      features={[
        "Direção, gestores e departamentos",
        "Equipes e colaboradores",
        "Responsabilidades de cada posição",
        "Navegação interativa",
      ]}
    />
  );
}
