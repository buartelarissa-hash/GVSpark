import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { requireAnyPagePermission } from "@/server/auth/current-user";

export const metadata = { title: "Cursos e treinamentos" };

export default async function Page() {
  await requireAnyPagePermission(["courses.manage", "courses.manageOwn"]);
  return (
    <ComingSoon
      title="Cursos e treinamentos"
      description="Cadastre, publique e atribua cursos."
      phase={3}
      icon={BookOpen}
      features={[
        "Cadastro completo do curso",
        "Módulos e aulas com arrastar e soltar",
        "Atribuição por departamento, cargo ou pessoa",
        "Trilhas automáticas por cargo",
      ]}
    />
  );
}
