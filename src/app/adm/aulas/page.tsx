import { PenSquare } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requireAnyPagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Editor de aulas" };

export default async function Page() {
  await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  return (
    <ComingSoon
      title="Editor de aulas"
      description="Monte aulas combinando blocos de conteúdo."
      phase={3}
      icon={PenSquare}
      features={[
        "Texto formatado, imagens e vídeos",
        "PDFs, apresentações e links",
        "Upload seguro de arquivos",
        "Pré-visualização antes de publicar",
      ]}
    />
  );
}
