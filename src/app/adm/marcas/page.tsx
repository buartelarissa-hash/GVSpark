import { Handshake } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Marcas parceiras" };

export default async function Page() {
  await requirePagePermission("courses.manage");
  return (
    <ComingSoon
      title="Marcas parceiras"
      description="Gerencie as marcas parceiras e seus conteúdos."
      phase={3}
      icon={Handshake}
      features={[
        "Logo e apresentação da marca",
        "Categorias de produtos",
        "Treinamentos vinculados",
        "Materiais técnicos e vídeos",
      ]}
    />
  );
}
