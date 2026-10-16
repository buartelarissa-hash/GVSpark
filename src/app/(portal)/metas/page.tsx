import { Target } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Metas e conquistas" };

export default function Page() {
  return (
    <ComingSoon
      title="Metas e conquistas"
      description="Seus indicadores de desempenho e reconhecimentos."
      phase={5}
      icon={Target}
      features={[
        "Metas mensais e percentual de atingimento",
        "Histórico e evolução dos resultados",
        "Medalhas digitais",
        "Reconhecimentos especiais",
      ]}
    />
  );
}
