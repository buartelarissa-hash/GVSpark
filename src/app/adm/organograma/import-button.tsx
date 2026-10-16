"use client";

import { useActionState } from "react";
import { Wand2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { importOrgAction } from "./actions";
import { keepFormValues } from "@/lib/forms";

export function ImportButton() {
  const [state, action] = useActionState(importOrgAction, {});
  return (
    <form ref={keepFormValues} action={action} className="flex flex-col items-end gap-2">
      <SubmitButton variant="outline" size="sm" pendingText="Importando...">
        <Wand2 /> Importar dos cadastros
      </SubmitButton>
      {state.message && <Alert tone={state.ok ? "success" : "danger"} className="py-2">{state.message}</Alert>}
    </form>
  );
}
