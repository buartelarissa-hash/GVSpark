import type { Role, UserStatus } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador geral",
  GESTOR: "Gestor",
  INSTRUTOR: "Instrutor",
  COLABORADOR: "Colaborador",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const ROLES: Role[] = ["ADMIN", "GESTOR", "INSTRUTOR", "COLABORADOR"];
