import { Landmark } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "História e cultura" };

export default async function Page() {
  await requirePagePermission("content.manage");
  return (
    <ComingSoon
      title="História e cultura"
      description="Edite os conteúdos institucionais exibidos aos colaboradores."
      phase={2}
      icon={Landmark}
      features={[
        "Seções de história, missão, visão, valores e propósito",
        "Linha do tempo com fotos",
        "Vídeo institucional",
        "Comunicados internos",
      ]}
    />
  );
}
