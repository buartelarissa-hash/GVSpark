import type { CompanySectionType } from "@prisma/client";

export const SECTION_TYPES: { type: CompanySectionType; label: string; hint: string }[] = [
  { type: "HISTORY", label: "História", hint: "Como a Gigavale começou e cresceu." },
  { type: "FOUNDERS", label: "Fundadores", hint: "Uma seção por fundador, com foto." },
  { type: "MISSION", label: "Missão", hint: "Texto curto e objetivo." },
  { type: "VISION", label: "Visão", hint: "Onde a empresa quer chegar." },
  { type: "VALUES", label: "Valores", hint: "Use uma lista para destacar cada valor." },
  { type: "PURPOSE", label: "Propósito", hint: "Por que a empresa existe." },
  { type: "CULTURE", label: "Cultura organizacional", hint: "Como trabalhamos, rituais, jeito Gigavale." },
  { type: "VIDEO", label: "Vídeo institucional", hint: "Link do YouTube ou Vimeo." },
];

export const SECTION_LABEL = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s.label])) as Record<
  CompanySectionType,
  string
>;
