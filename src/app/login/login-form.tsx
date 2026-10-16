"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="E-mail corporativo" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="nome@gigavale.com.br"
          required
          autoFocus
          aria-invalid={!!state.errors?.email}
        />
      </Field>
      <Field label="Senha" htmlFor="password" error={state.errors?.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
            aria-invalid={!!state.errors?.password}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-ink"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Entrando...">
        <LogIn /> Entrar
      </SubmitButton>
      <p className="text-center text-xs text-muted">
        Esqueceu a senha? Procure o administrador do GV SPARK para gerar uma senha temporária.
      </p>
    </form>
  );
}
