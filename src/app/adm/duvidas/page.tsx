import { MessageCircleQuestion } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Central de dúvidas" };

export default async function Page() {
  await requirePagePermission("inquiries.manage");
  return (
    <ComingSoon
      title="Central de dúvidas"
      description="Responda e encaminhe as dúvidas dos colaboradores."
      phase={5}
      icon={MessageCircleQuestion}
      features={[
        "Fila de dúvidas por status",
        "Responder e encaminhar",
        "Transformar em pergunta frequente",
        "Indicadores de atendimento",
      ]}
    />
  );
}
