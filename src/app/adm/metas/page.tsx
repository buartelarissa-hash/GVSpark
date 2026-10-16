import { Target } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Metas e conquistas" };

export default async function Page() {
  await requirePagePermission("goals.manage");
  return (
    <ComingSoon
      title="Metas e conquistas"
      description="Cadastre indicadores, metas e reconhecimentos."
      phase={5}
      icon={Target}
      features={[
        "Indicadores por cargo e departamento",
        "Lançamento de metas e resultados mensais",
        "Medalhas e categorias de reconhecimento",
        "Histórico de atingimento",
      ]}
    />
  );
}
