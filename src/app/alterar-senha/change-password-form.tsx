"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <Field label="Senha atual" htmlFor="current" error={state.errors?.current} required>
        <Input id="current" name="current" type="password" autoComplete="current-password" required aria-invalid={!!state.errors?.current} />
      </Field>
      <Field label="Nova senha" htmlFor="password" error={state.errors?.password} hint="Mínimo de 8 caracteres, com letras e números." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!state.errors?.password} />
      </Field>
      <Field label="Confirme a nova senha" htmlFor="confirm" error={state.errors?.confirm} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!state.errors?.confirm} />
      </Field>
      <SubmitButton pendingText="Salvando...">Alterar senha</SubmitButton>
    </form>
  );
}
