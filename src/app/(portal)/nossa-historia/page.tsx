import { Landmark } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Nossa história" };

export default function Page() {
  return (
    <ComingSoon
      title="Nossa história"
      description="A história, a cultura e a identidade da Gigavale Atacado."
      phase={2}
      icon={Landmark}
      features={[
        "História e fundadores",
        "Linha do tempo com marcos importantes",
        "Missão, visão, valores e propósito",
        "Vídeo institucional e cultura organizacional",
      ]}
    />
  );
}
