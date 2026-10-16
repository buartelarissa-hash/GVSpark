import { MessageCircleQuestion } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Central de dúvidas" };

export default function Page() {
  return (
    <ComingSoon
      title="Central de dúvidas"
      description="Tire dúvidas sobre produtos, aplicações, treinamentos e processos."
      phase={5}
      icon={MessageCircleQuestion}
      features={[
        "Envio de dúvidas por categoria",
        "Acompanhamento do status da resposta",
        "Perguntas frequentes",
        "Histórico das suas dúvidas",
      ]}
    />
  );
}
