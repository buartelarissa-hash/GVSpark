"use client";

import * as React from "react";
import { useActionState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";
import { Button, type ButtonProps } from "./button";
import { SubmitButton } from "./submit-button";
import { Alert } from "./alert";
import type { ActionState } from "@/lib/validation";

type ActionFn = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Botão que abre uma confirmação antes de executar uma ação (irreversível ou sensível).
 * `hidden` envia campos ocultos para a server action.
 * Com `onDoneMessage`, o resultado (inclusive `secret`) é exibido no próprio diálogo;
 * o estado é descartado ao fechar, para que um segredo não seja exibido de novo.
 */
export function ConfirmAction({
  trigger,
  triggerLabel,
  triggerVariant = "outline",
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  action,
  hidden,
  onDoneMessage,
}: {
  trigger: React.ReactNode;
  /** Rótulo acessível quando o gatilho é apenas um ícone. */
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonProps["variant"];
  action: ActionFn;
  hidden: Record<string, string>;
  onDoneMessage?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [session, setSession] = React.useState(0);
  const onOpenChange = (v: boolean) => {
    if (v) setSession((s) => s + 1);
    setOpen(v);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" aria-label={triggerLabel} title={triggerLabel}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <ConfirmBody
          key={session}
          action={action}
          hidden={hidden}
          confirmLabel={confirmLabel}
          confirmVariant={confirmVariant}
          onDoneMessage={onDoneMessage}
          close={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBody({
  action,
  hidden,
  confirmLabel,
  confirmVariant,
  onDoneMessage,
  close,
}: {
  action: ActionFn;
  hidden: Record<string, string>;
  confirmLabel: string;
  confirmVariant: ButtonProps["variant"];
  onDoneMessage?: boolean;
  close: () => void;
}) {
  const [state, formAction] = useActionState(action, {});
  React.useEffect(() => {
    if (state.ok && !onDoneMessage) close();
  }, [state, onDoneMessage, close]);

  if (onDoneMessage && state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title={state.message} />
        {state.secret && (
          <div className="rounded-lg border border-dashed border-navy-600 bg-navy-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Senha temporária</p>
            <p className="mt-1 select-all font-mono text-xl font-bold tracking-wider text-navy-900">{state.secret}</p>
            <p className="mt-2 text-xs text-muted">
              Ela não será exibida novamente. O colaborador deverá trocá-la no primeiro acesso.
            </p>
          </div>
        )}
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="navy">Concluir</Button>
          </DialogClose>
        </div>
      </div>
    );
  }

  return (
    <>
      {state.message && !state.ok && (
        <Alert tone="danger" className="mb-4">
          {state.message}
        </Alert>
      )}
      <form action={formAction} className="flex justify-end gap-2">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton variant={confirmVariant} pendingText="Processando...">
          {confirmLabel}
        </SubmitButton>
      </form>
    </>
  );
}
