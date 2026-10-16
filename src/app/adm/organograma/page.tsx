import { Network } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Organograma" };

export default async function Page() {
  await requirePagePermission("org.manage");
  return (
    <ComingSoon
      title="Organograma"
      description="Monte e mantenha a estrutura organizacional."
      phase={2}
      icon={Network}
      features={[
        "Adicionar, mover e desativar posições",
        "Posições vagas",
        "Vincular colaboradores",
        "Responsabilidades por posição",
      ]}
    />
  );
}
