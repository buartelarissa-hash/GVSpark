"use client";

import * as React from "react";
import { useActionState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";
import { Alert } from "./alert";
import type { ActionState } from "@/lib/validation";
import { keepFormValues } from "@/lib/forms";

type ActionFn = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Diálogo com formulário ligado a uma server action. Fecha ao salvar com sucesso
 * e reinicia o estado sempre que é reaberto.
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Salvar",
  className,
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: ActionFn;
  submitLabel?: string;
  className?: string;
  children: (errors: Record<string, string>) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [round, setRound] = React.useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setRound((r) => r + 1);
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description} className={className}>
        <FormBody key={round} action={action} submitLabel={submitLabel} onDone={() => setOpen(false)}>
          {children}
        </FormBody>
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  action,
  submitLabel,
  onDone,
  children,
}: {
  action: ActionFn;
  submitLabel: string;
  onDone: () => void;
  children: (errors: Record<string, string>) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  const done = React.useRef(onDone);
  React.useEffect(() => {
    if (state.ok) done.current();
  }, [state]);
  return (
    <form ref={keepFormValues} action={formAction} className="space-y-4">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      {children(state.errors ?? {})}
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <SubmitButton pendingText="Salvando...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
