import { BookOpen, Disc3, Droplets, Hammer, HardHat, Lightbulb, Package, PaintRoller, Ruler, ShowerHead, Truck, Wrench, Zap, type LucideIcon } from "lucide-react";

/** Ícones disponíveis para categorias de cursos. */
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  droplets: { icon: Droplets, label: "Gotas (adesivos e selantes)" },
  zap: { icon: Zap, label: "Raio (elétrica)" },
  shower: { icon: ShowerHead, label: "Chuveiro (hidráulica)" },
  paint: { icon: PaintRoller, label: "Rolo (tintas)" },
  hammer: { icon: Hammer, label: "Martelo (ferramentas)" },
  disc: { icon: Disc3, label: "Disco (abrasivos)" },
  package: { icon: Package, label: "Caixa (acessórios)" },
  wrench: { icon: Wrench, label: "Chave" },
  hardhat: { icon: HardHat, label: "Capacete" },
  ruler: { icon: Ruler, label: "Régua" },
  truck: { icon: Truck, label: "Caminhão" },
  idea: { icon: Lightbulb, label: "Lâmpada" },
  book: { icon: BookOpen, label: "Livro" },
};

export function CategoryIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]?.icon) || BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}
