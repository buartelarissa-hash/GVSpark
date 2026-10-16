import { Handshake } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Marcas parceiras" };

export default function Page() {
  return (
    <ComingSoon
      title="Marcas parceiras"
      description="Treinamentos e materiais das marcas parceiras."
      phase={3}
      icon={Handshake}
      features={[
        "Página de cada marca parceira",
        "Categorias de produtos",
        "Treinamentos e materiais técnicos",
        "Avaliações relacionadas",
      ]}
    />
  );
}
