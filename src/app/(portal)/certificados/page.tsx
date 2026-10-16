import { Award } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Certificados" };

export default function Page() {
  return (
    <ComingSoon
      title="Certificados"
      description="Seus certificados digitais de conclusão."
      phase={4}
      icon={Award}
      features={[
        "Certificados conquistados",
        "Download em PDF",
        "Código de validação único",
        "Carga horária e data de conclusão",
      ]}
    />
  );
}
