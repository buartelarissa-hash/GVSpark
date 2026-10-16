import { Award } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Certificados" };

export default async function Page() {
  await requirePagePermission("certificates.manage");
  return (
    <ComingSoon
      title="Certificados"
      description="Acompanhe os certificados emitidos."
      phase={4}
      icon={Award}
      features={[
        "Certificados emitidos por curso",
        "Validação por código único",
        "Revogação com justificativa",
        "Regras de emissão",
      ]}
    />
  );
}
