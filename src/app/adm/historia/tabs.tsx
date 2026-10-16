import { TabsNav } from "@/components/ui/tabs-nav";

export function HistoryTabs() {
  return (
    <TabsNav
      tabs={[
        { href: "/adm/historia", label: "Conteúdo institucional", exact: true },
        { href: "/adm/historia/linha-do-tempo", label: "Linha do tempo" },
        { href: "/adm/historia/comunicados", label: "Comunicados" },
      ]}
    />
  );
}
