import { TabsNav } from "@/components/ui/tabs-nav";

export function AcademyTabs({ admin }: { admin: boolean }) {
  return (
    <TabsNav
      tabs={[
        { href: "/adm/cursos", label: "Cursos", exact: true },
        ...(admin
          ? [
              { href: "/adm/cursos/categorias", label: "Categorias" },
              { href: "/adm/cursos/trilhas", label: "Trilhas de aprendizagem" },
            ]
          : []),
      ]}
    />
  );
}
