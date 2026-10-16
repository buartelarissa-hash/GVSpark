/**
 * Regras puras da jornada de integração (modelo híbrido).
 *
 * - As etapas obrigatórias seguem a ordem: uma etapa só pode ser concluída depois
 *   das obrigatórias anteriores. Etapas opcionais podem ser feitas a qualquer momento.
 * - Os materiais de consulta (história, organograma etc.) continuam livres no menu.
 * - A etapa de conclusão é concluída automaticamente quando todas as obrigatórias
 *   anteriores estiverem concluídas.
 * - Etapas de curso/avaliação são concluídas pelo sistema (Fases 3 e 4), nunca manualmente.
 */
import type { OnboardingStepType } from "@prisma/client";
import { textToRichDoc } from "./rich-text";

export type StepInput = { id: string; order: number; type: OnboardingStepType; required: boolean };

export type StepState = "done" | "available" | "locked";

export const AUTO_COMPLETED_TYPES: OnboardingStepType[] = ["COURSE", "ASSESSMENT", "CONCLUSION"];

export function computeOnboarding(steps: StepInput[], completedIds: ReadonlySet<string>) {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  let blocked = false;
  const states = new Map<string, StepState>();
  for (const s of ordered) {
    // `blocked` falso significa que todas as obrigatórias anteriores estão concluídas.
    const done = completedIds.has(s.id) || (s.type === "CONCLUSION" && !blocked);
    states.set(s.id, done ? "done" : blocked && s.required ? "locked" : "available");
    if (s.required && !done) blocked = true;
  }
  const requiredSteps = ordered.filter((s) => s.required);
  const doneCount = ordered.filter((s) => states.get(s.id) === "done").length;
  const requiredDone = requiredSteps.filter((s) => states.get(s.id) === "done").length;
  return {
    states,
    total: ordered.length,
    doneCount,
    percent: ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0,
    completed: requiredSteps.length > 0 && requiredDone === requiredSteps.length,
    nextStepId: ordered.find((s) => states.get(s.id) === "available")?.id ?? null,
  };
}

/** Pode o colaborador marcar esta etapa manualmente como concluída? */
export function canCompleteManually(step: StepInput, state: StepState | undefined): boolean {
  return state === "available" && !AUTO_COMPLETED_TYPES.includes(step.type);
}

export const STEP_TYPE_LABELS: Record<OnboardingStepType, string> = {
  WELCOME: "Boas-vindas",
  HISTORY: "Nossa história",
  VALUES: "Missão, visão e valores",
  ORGCHART: "Organograma",
  COURSE: "Treinamento obrigatório",
  ASSESSMENT: "Avaliação de integração",
  CUSTOM: "Etapa personalizada",
  CONCLUSION: "Conclusão",
};

/** Página relacionada a cada tipo de etapa (materiais de consulta). */
export const STEP_TYPE_LINKS: Partial<Record<OnboardingStepType, string>> = {
  HISTORY: "/nossa-historia",
  VALUES: "/nossa-historia#valores",
  ORGCHART: "/organograma",
  COURSE: "/academy",
};

/** Etapas sugeridas para uma nova trilha (modelo híbrido do GV SPARK). */
export const DEFAULT_STEPS: { type: OnboardingStepType; title: string; description: string; content?: string }[] = [
  {
    type: "WELCOME",
    title: "Boas-vindas",
    description: "Uma mensagem de boas-vindas para começar sua jornada.",
    content:
      "Seja bem-vindo(a) à Gigavale Atacado! Esta trilha vai apresentar a nossa história, a nossa cultura e as pessoas com quem você vai trabalhar.\n\nSiga as etapas na ordem e marque cada uma como concluída. Os materiais continuam disponíveis no menu sempre que você quiser consultar.",
  },
  { type: "HISTORY", title: "Nossa história", description: "Conheça a trajetória da Gigavale e seus principais marcos." },
  { type: "VALUES", title: "Missão, visão e valores", description: "Entenda o que nos guia no dia a dia." },
  { type: "ORGCHART", title: "Organograma", description: "Conheça a estrutura da empresa, seu gestor e sua equipe." },
  { type: "COURSE", title: "Treinamentos obrigatórios", description: "Conclua os treinamentos obrigatórios da integração." },
  { type: "ASSESSMENT", title: "Avaliação de integração", description: "Responda à avaliação sobre o que você aprendeu." },
  { type: "CONCLUSION", title: "Conclusão da integração", description: "Parabéns! Sua integração estará concluída." },
];

/**
 * Linhas prontas para criar as etapas sugeridas. Curso e avaliação começam como
 * opcionais enquanto a Academy (Fases 3 e 4) não estiver disponível.
 */
export function defaultStepRows() {
  return DEFAULT_STEPS.map((s, i) => ({
    order: i + 1,
    type: s.type,
    title: s.title,
    description: s.description,
    content: s.content ? textToRichDoc(s.content) : undefined,
    required: s.type !== "COURSE" && s.type !== "ASSESSMENT",
  }));
}
