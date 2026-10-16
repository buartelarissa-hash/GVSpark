"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/validation";
import { saveDepartmentAction, savePositionAction } from "./actions";

type Opt = { id: string; name: string };

function useCloseOnSuccess(state: ActionState, setOpen: (v: boolean) => void) {
  React.useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state, setOpen]);
}

const TriggerButton = React.forwardRef<HTMLButtonElement, { editing: boolean; label: string } & ButtonProps>(
  ({ editing, label, ...props }, ref) =>
    editing ? (
      <Button ref={ref} variant="ghost" size="icon" aria-label={`Editar ${label}`} {...props}>
        <Pencil />
      </Button>
    ) : (
      <Button ref={ref} size="sm" {...props}>
        <Plus /> {label}
      </Button>
    ),
);
TriggerButton.displayName = "TriggerButton";

export function DepartmentDialog({
  department,
  departments,
  heads,
}: {
  department?: { id: string; name: string; description: string | null; parentId: string | null; headId: string | null };
  departments: Opt[];
  heads: Opt[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(saveDepartmentAction, {});
  useCloseOnSuccess(state, setOpen);
  const e = state.errors ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton editing={!!department} label={department ? department.name : "Novo departamento"} />
      </DialogTrigger>
      <DialogContent title={department ? "Editar departamento" : "Novo departamento"}>
        <form action={action} className="space-y-4" key={open ? "open" : "closed"}>
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
          {department && <input type="hidden" name="id" value={department.id} />}
          <Field label="Nome" htmlFor="dep-name" error={e.name} required>
            <Input id="dep-name" name="name" defaultValue={department?.name} required maxLength={80} />
          </Field>
          <Field label="Descrição" htmlFor="dep-desc" error={e.description}>
            <Textarea id="dep-desc" name="description" defaultValue={department?.description ?? ""} maxLength={500} />
          </Field>
          <Field label="Departamento superior" htmlFor="dep-parent" error={e.parentId}>
            <Select id="dep-parent" name="parentId" defaultValue={department?.parentId ?? ""}>
              <option value="">Nenhum</option>
              {departments
                .filter((d) => d.id !== department?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </Select>
          </Field>
          <Field label="Responsável" htmlFor="dep-head" error={e.headId} hint="O gestor responsável visualiza os colaboradores deste departamento.">
            <Select id="dep-head" name="headId" defaultValue={department?.headId ?? ""}>
              <option value="">Não definido</option>
              {heads.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PositionDialog({
  position,
  departments,
}: {
  position?: { id: string; title: string; description: string | null; departmentId: string | null };
  departments: Opt[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(savePositionAction, {});
  useCloseOnSuccess(state, setOpen);
  const e = state.errors ?? {};
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton editing={!!position} label={position ? position.title : "Novo cargo"} />
      </DialogTrigger>
      <DialogContent title={position ? "Editar cargo" : "Novo cargo"}>
        <form action={action} className="space-y-4" key={open ? "open" : "closed"}>
          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
          {position && <input type="hidden" name="id" value={position.id} />}
          <Field label="Nome do cargo" htmlFor="pos-title" error={e.title} required>
            <Input id="pos-title" name="title" defaultValue={position?.title} required maxLength={80} />
          </Field>
          <Field label="Departamento" htmlFor="pos-dep" error={e.departmentId}>
            <Select id="pos-dep" name="departmentId" defaultValue={position?.departmentId ?? ""}>
              <option value="">Todos / não vinculado</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição e responsabilidades" htmlFor="pos-desc" error={e.description}>
            <Textarea id="pos-desc" name="description" defaultValue={position?.description ?? ""} maxLength={500} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
