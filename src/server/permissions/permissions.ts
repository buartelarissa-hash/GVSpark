/**
 * Matriz de permissões do GV SPARK.
 *
 * Este módulo é puro (sem acesso a banco), para ser usado tanto pelos guards do
 * servidor quanto pelos testes. A interface usa as mesmas regras apenas para
 * esconder itens — a verificação que vale é sempre a do servidor.
 */
import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "portal.access",
  "admin.access",
  "users.view",
  "users.edit",
  "users.manage",
  "org.manage",
  "content.manage",
  "courses.manage",
  "courses.manageOwn",
  "questions.manage",
  "assessments.grade",
  "assessments.release",
  "retakes.authorize",
  "grades.view",
  "certificates.manage",
  "career.manage",
  "goals.manage",
  "inquiries.manage",
  "reports.view",
  "settings.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "portal.access": "Acessar o Portal do Colaborador",
  "admin.access": "Acessar o Portal ADM",
  "users.view": "Visualizar colaboradores",
  "users.edit": "Editar dados de colaboradores",
  "users.manage": "Cadastrar colaboradores, definir perfis e desativar acessos",
  "org.manage": "Gerenciar departamentos, cargos e organograma",
  "content.manage": "Editar história, cultura e comunicados",
  "courses.manage": "Gerenciar todos os cursos",
  "courses.manageOwn": "Gerenciar cursos sob sua responsabilidade",
  "questions.manage": "Gerenciar banco de questões",
  "assessments.grade": "Aplicar provas e corrigir/editar notas",
  "assessments.release": "Liberar resultados",
  "retakes.authorize": "Autorizar novas tentativas",
  "grades.view": "Consultar histórico de notas",
  "certificates.manage": "Gerenciar certificados",
  "career.manage": "Gerenciar jornada profissional",
  "goals.manage": "Gerenciar metas e conquistas",
  "inquiries.manage": "Responder à central de dúvidas",
  "reports.view": "Visualizar relatórios",
  "settings.manage": "Alterar configurações e permissões",
  "audit.view": "Consultar auditoria",
};

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ALL,
  // Gestor: tudo restrito à própria equipe (ver visibleUsersWhere / canEditUser).
  GESTOR: [
    "portal.access",
    "admin.access",
    "users.view",
    "users.edit", // dados cadastrais, metas, feedbacks, jornada; não altera perfil de acesso
    "grades.view",
    "career.manage",
    "goals.manage",
    "reports.view",
  ],
  // Instrutor: aplica provas e corrige/edita notas de TODOS os cursos.
  INSTRUTOR: [
    "portal.access",
    "admin.access",
    "courses.manageOwn",
    "questions.manage",
    "assessments.grade",
    "assessments.release",
    "retakes.authorize",
    "grades.view",
    "inquiries.manage",
  ],
  COLABORADOR: ["portal.access"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Escopo de visibilidade de dados de pessoas para quem consulta. */
export type UserScope = { kind: "all" } | { kind: "team"; managerId: string } | { kind: "self"; userId: string };

export function userScopeFor(actor: { id: string; role: Role }): UserScope {
  if (actor.role === "ADMIN") return { kind: "all" };
  if (actor.role === "GESTOR") return { kind: "team", managerId: actor.id };
  return { kind: "self", userId: actor.id };
}

/**
 * Verifica se `actor` pode ver os dados individuais de `target`.
 * Gestor vê a si mesmo, subordinados diretos e membros dos departamentos que chefia.
 */
export function canViewUser(
  actor: { id: string; role: Role; headedDepartmentIds?: string[] },
  target: { id: string; managerId: string | null; departmentId: string | null },
): boolean {
  if (actor.id === target.id) return true;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "GESTOR") {
    if (target.managerId === actor.id) return true;
    if (target.departmentId && actor.headedDepartmentIds?.includes(target.departmentId)) return true;
  }
  return false;
}

/**
 * Quem pode editar os dados de `target`:
 * - administrador geral: qualquer pessoa;
 * - gestor: membros da equipe (que já passaram pelo filtro de visibilidade),
 *   exceto administradores — e nunca o perfil de acesso (ver users.manage).
 */
export function canEditUser(
  actor: { id: string; role: Role; headedDepartmentIds?: string[] },
  target: { id: string; role: Role; managerId: string | null; departmentId: string | null },
): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role !== "GESTOR" || target.role === "ADMIN") return false;
  return canViewUser(actor, target);
}

/**
 * Valida mudanças de papel/status feitas por um administrador sobre um usuário.
 * Impede que o administrador se rebaixe ou se desative (evita perder o último acesso total).
 * Retorna mensagem de erro ou null.
 */
export function selfChangeError(
  actorId: string,
  targetId: string,
  change: { role?: Role; status?: "ACTIVE" | "INACTIVE" },
): string | null {
  if (actorId !== targetId) return null;
  if (change.status === "INACTIVE") return "Você não pode desativar o seu próprio acesso.";
  if (change.role && change.role !== "ADMIN") return "Você não pode remover o seu próprio perfil de administrador.";
  return null;
}

/** Rota inicial após login, por papel. */
export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/adm" : "/inicio";
}
