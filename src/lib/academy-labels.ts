import type { AssignmentTarget, CourseLevel, CourseStatus } from "@prisma/client";

export const COURSE_STATUS: Record<CourseStatus, { label: string; tone: "neutral" | "warning" | "success" | "danger" }> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  REVIEW: { label: "Em revisão", tone: "warning" },
  PUBLISHED: { label: "Publicado", tone: "success" },
  ARCHIVED: { label: "Arquivado", tone: "danger" },
};

export const COURSE_LEVEL: Record<CourseLevel, string> = {
  BASIC: "Básico",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

export const ASSIGNMENT_TARGET: Record<AssignmentTarget, string> = {
  ALL: "Todos os colaboradores",
  DEPARTMENT: "Departamento",
  POSITION: "Cargo",
  USER: "Colaborador",
};

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : "", m ? `${m}min` : ""].filter(Boolean).join(" ");
}
