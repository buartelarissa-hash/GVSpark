import { Route } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Jornada profissional" };

export default async function Page() {
  await requirePagePermission("career.manage");
  return (
    <ComingSoon
      title="Jornada profissional"
      description="Registre marcos profissionais dos colaboradores."
      phase={5}
      icon={Route}
      features={[
        "Histórico de cargos e promoções",
        "Marcos e feedbacks autorizados",
        "PDI e competências",
        "Linha do tempo individual",
      ]}
    />
  );
}
