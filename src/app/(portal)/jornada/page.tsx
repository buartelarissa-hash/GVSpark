import { Route } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Minha jornada" };

export default function Page() {
  return (
    <ComingSoon
      title="Minha jornada"
      description="Sua trajetória profissional na Gigavale."
      phase={5}
      icon={Route}
      features={[
        "Linha do tempo profissional",
        "Histórico de cargos e marcos",
        "Plano de desenvolvimento individual (PDI)",
        "Competências e próximos objetivos",
      ]}
    />
  );
}
