import { GraduationCap } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "GV Spark Academy" };

export default function Page() {
  return (
    <ComingSoon
      title="GV Spark Academy"
      description="A universidade corporativa da Gigavale."
      phase={3}
      icon={GraduationCap}
      features={[
        "Conhecimento técnico por categoria de produto",
        "Cursos com módulos e aulas",
        "Vídeos, PDFs e materiais complementares",
        "Acompanhamento do seu progresso",
      ]}
    />
  );
}
