"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeStepAction } from "./actions";
import { keepFormValues } from "@/lib/forms";

export function CompleteButton({ stepId }: { stepId: string }) {
  const [state, action] = useActionState(completeStepAction, {});
  return (
    <form ref={keepFormValues} action={action}>
      <input type="hidden" name="stepId" value={stepId} />
      <SubmitButton size="sm" pendingText="Salvando...">
        <Check /> Marcar como concluída
      </SubmitButton>
      {state.message && !state.ok && <p role="alert" className="mt-2 text-xs font-medium text-danger">{state.message}</p>}
    </form>
  );
}
