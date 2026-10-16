import { FileQuestion } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requirePagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Banco de questões" };

export default async function Page() {
  await requirePagePermission("questions.manage");
  return (
    <ComingSoon
      title="Banco de questões"
      description="Questões reutilizáveis para as avaliações."
      phase={4}
      icon={FileQuestion}
      features={[
        "Múltipla escolha, verdadeiro/falso e resposta aberta",
        "Imagem de apoio e explicação",
        "Pontuação e categoria de conhecimento",
        "Reutilização entre provas",
      ]}
    />
  );
}
