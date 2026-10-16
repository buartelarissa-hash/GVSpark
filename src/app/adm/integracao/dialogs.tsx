"use client";

import * as React from "react";
import { Pencil, Plus, Settings2 } from "lucide-react";
import type { OnboardingStepType } from "@prisma/client";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { STEP_TYPE_LABELS } from "@/lib/onboarding";
import { saveStepAction, saveTrackAction } from "./actions";

type Opt = { id: string; label: string };

export type TrackData = {
  id: string;
  name: string;
  description: string | null;
  positionId: string | null;
  isDefault: boolean;
  active: boolean;
};

export function TrackDialog({ track, positions }: { track?: TrackData; positions: Opt[] }) {
  return (
    <FormDialog
      title={track ? "Configurar trilha" : "Nova trilha de integração"}
      description="Uma trilha pode ser a padrão (para todos) ou específica de um cargo."
      action={saveTrackAction}
      className="max-w-xl"
      trigger={
        track ? (
          <Button variant="outline" size="sm">
            <Settings2 /> Configurar
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Nova trilha
          </Button>
        )
      }
    >
      {(e) => (
        <>
          {track && <input type="hidden" name="id" value={track.id} />}
          <Field label="Nome" htmlFor="tr-name" error={e.name} required>
            <Input id="tr-name" name="name" defaultValue={track?.name} maxLength={100} required aria-invalid={!!e.name} />
          </Field>
          <Field label="Descrição (exibida ao colaborador)" htmlFor="tr-desc" error={e.description}>
            <Textarea id="tr-desc" name="description" defaultValue={track?.description ?? ""} maxLength={500} rows={3} />
          </Field>
          <Field label="Cargo" htmlFor="tr-pos" error={e.positionId} hint="Colaboradores desse cargo seguem esta trilha em vez da padrão.">
            <Select id="tr-pos" name="positionId" defaultValue={track?.positionId ?? ""} aria-invalid={!!e.positionId}>
              <option value="">Nenhum (trilha geral)</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <div className="space-y-2 text-sm font-medium">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isDefault" defaultChecked={track?.isDefault} className="size-4 accent-navy-700" />
              Trilha padrão (para quem não tem trilha específica do cargo)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={track?.active ?? true} className="size-4 accent-navy-700" />
              Ativa
            </label>
            {!track && (
              <label className="flex items-center gap-2">
                <input type="checkbox" name="withDefaultSteps" defaultChecked className="size-4 accent-navy-700" />
                Começar com as 7 etapas sugeridas (boas-vindas a conclusão)
              </label>
            )}
          </div>
        </>
      )}
    </FormDialog>
  );
}

export type StepData = {
  id: string;
  type: OnboardingStepType;
  title: string;
  description: string | null;
  content: unknown;
  linkUrl: string | null;
  required: boolean;
};

const TYPE_HINTS: Partial<Record<OnboardingStepType, string>> = {
  HISTORY: "Leva o colaborador à página Nossa história.",
  VALUES: "Leva à seção de missão, visão e valores.",
  ORGCHART: "Leva ao organograma.",
  COURSE: "Concluída automaticamente ao terminar o curso (disponível com a Academy, Fase 3).",
  ASSESSMENT: "Concluída automaticamente quando a avaliação for aprovada (Fase 4).",
  CONCLUSION: "Concluída automaticamente ao terminar as etapas obrigatórias anteriores.",
  CUSTOM: "Etapa livre, com texto e link opcional.",
};

export function StepDialog({ trackId, step }: { trackId: string; step?: StepData }) {
  const [type, setType] = React.useState<OnboardingStepType>(step?.type ?? "CUSTOM");
  return (
    <FormDialog
      title={step ? "Editar etapa" : "Nova etapa"}
      action={saveStepAction}
      className="max-w-2xl"
      trigger={
        step ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${step.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Nova etapa
          </Button>
        )
      }
    >
      {(e) => (
        <>
          <input type="hidden" name="trackId" value={trackId} />
          {step && <input type="hidden" name="id" value={step.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="st-type" error={e.type} hint={TYPE_HINTS[type]}>
              <Select id="st-type" name="type" value={type} onChange={(ev) => setType(ev.target.value as OnboardingStepType)}>
                {(Object.keys(STEP_TYPE_LABELS) as OnboardingStepType[]).map((t) => (
                  <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Título" htmlFor="st-title" error={e.title} required>
              <Input id="st-title" name="title" defaultValue={step?.title} maxLength={120} required aria-invalid={!!e.title} />
            </Field>
          </div>
          <Field label="Descrição curta" htmlFor="st-desc" error={e.description}>
            <Input id="st-desc" name="description" defaultValue={step?.description ?? ""} maxLength={500} />
          </Field>
          <Field label="Conteúdo da etapa (opcional)" htmlFor="st-content">
            <RichTextEditor id="st-content" name="content" defaultValue={step?.content ?? undefined} minHeight="8rem" />
          </Field>
          {type === "CUSTOM" && (
            <Field label="Link complementar (opcional)" htmlFor="st-link" error={e.linkUrl}>
              <Input id="st-link" name="linkUrl" type="url" defaultValue={step?.linkUrl ?? ""} placeholder="https://" aria-invalid={!!e.linkUrl} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="required" defaultChecked={step?.required ?? true} className="size-4 accent-navy-700" />
            Etapa obrigatória (precisa ser concluída para liberar as seguintes)
          </label>
        </>
      )}
    </FormDialog>
  );
}
