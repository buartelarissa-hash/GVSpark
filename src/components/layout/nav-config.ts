import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Handshake,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  MessageCircleQuestion,
  Network,
  PenSquare,
  Rocket,
  Route,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/server/permissions/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Basta uma das permissões. */
  anyOf?: Permission[];
  /** Fase do roadmap em que a funcionalidade será entregue (ausente = disponível). */
  phase?: number;
  exact?: boolean;
  /** Outros prefixos de rota que também marcam o item como ativo. */
  alsoActive?: string[];
};

export type NavGroup = { label?: string; items: NavItem[] };

export const COLABORADOR_NAV: NavGroup[] = [
  { items: [{ label: "Início", href: "/inicio", icon: Home }] },
  {
    label: "Integração",
    items: [
      { label: "Minha integração", href: "/integracao", icon: Rocket },
      { label: "Nossa história", href: "/nossa-historia", icon: Landmark },
      { label: "Organograma", href: "/organograma", icon: Network },
    ],
  },
  {
    label: "GV Spark Academy",
    items: [
      { label: "Cursos", href: "/academy", icon: GraduationCap, exact: true, alsoActive: ["/academy/cursos", "/academy/meus-cursos"] },
      { label: "Marcas parceiras", href: "/academy/marcas", icon: Handshake },
      { label: "Central de dúvidas", href: "/duvidas", icon: MessageCircleQuestion, phase: 5 },
    ],
  },
  {
    label: "Meu desenvolvimento",
    items: [
      { label: "Histórico acadêmico", href: "/historico", icon: ClipboardList, phase: 4 },
      { label: "Certificados", href: "/certificados", icon: Award, phase: 4 },
      { label: "Minha jornada", href: "/jornada", icon: Route, phase: 5 },
      { label: "Metas e conquistas", href: "/metas", icon: Target, phase: 5 },
    ],
  },
];

const COURSES: Permission[] = ["courses.manage", "courses.manageOwn"];

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/adm", icon: LayoutDashboard, anyOf: ["admin.access"], exact: true }] },
  {
    label: "Pessoas e empresa",
    items: [
      { label: "Colaboradores", href: "/adm/colaboradores", icon: Users, anyOf: ["users.view"] },
      { label: "Departamentos e cargos", href: "/adm/departamentos", icon: Building2, anyOf: ["org.manage"] },
      { label: "História e cultura", href: "/adm/historia", icon: Landmark, anyOf: ["content.manage"] },
      { label: "Organograma", href: "/adm/organograma", icon: Network, anyOf: ["org.manage"] },
      { label: "Trilhas de integração", href: "/adm/integracao", icon: Rocket, anyOf: ["content.manage"] },
    ],
  },
  {
    label: "Academy",
    items: [
      { label: "Cursos e treinamentos", href: "/adm/cursos", icon: BookOpen, anyOf: COURSES },
      { label: "Editor de aulas", href: "/adm/aulas", icon: PenSquare, anyOf: COURSES },
      { label: "Marcas parceiras", href: "/adm/marcas", icon: Handshake, anyOf: ["courses.manage"] },
      { label: "Banco de questões", href: "/adm/questoes", icon: FileQuestion, anyOf: ["questions.manage"], phase: 4 },
      { label: "Avaliações e correções", href: "/adm/avaliacoes", icon: ClipboardCheck, anyOf: ["assessments.grade"], phase: 4 },
      { label: "Histórico de notas", href: "/adm/notas", icon: History, anyOf: ["grades.view"], phase: 4 },
      { label: "Certificados", href: "/adm/certificados", icon: Award, anyOf: ["certificates.manage"], phase: 4 },
    ],
  },
  {
    label: "Desenvolvimento",
    items: [
      { label: "Jornada profissional", href: "/adm/jornada", icon: Route, anyOf: ["career.manage"], phase: 5 },
      { label: "Metas e conquistas", href: "/adm/metas", icon: Target, anyOf: ["goals.manage"], phase: 5 },
      { label: "Central de dúvidas", href: "/adm/duvidas", icon: MessageCircleQuestion, anyOf: ["inquiries.manage"], phase: 5 },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Relatórios", href: "/adm/relatorios", icon: BarChart3, anyOf: ["reports.view"], phase: 6 },
      { label: "Configurações e permissões", href: "/adm/configuracoes", icon: Settings, anyOf: ["settings.manage"] },
    ],
  },
];

export function filterNav(groups: NavGroup[], permissions: readonly string[]): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.anyOf || i.anyOf.some((p) => permissions.includes(p))) }))
    .filter((g) => g.items.length > 0);
}

