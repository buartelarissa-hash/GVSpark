"use client";

import * as React from "react";
import { useActionState } from "react";
import { Search } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { ASSIGNMENT_TARGET } from "@/lib/academy-labels";
import { keepFormValues } from "@/lib/forms";
import { addAssignmentAction } from "../../actions";

type Opt = { id: string; label: string };

export function AssignForm({ courseId, departments, positions, users }: { courseId: string; departments: Opt[]; positions: Opt[]; users: Opt[] }) {
  const [state, action] = useActionState(addAssignmentAction, {});
  const [target, setTarget] = React.useState("ALL");
  const [q, setQ] = React.useState("");
  const e = state.errors ?? {};
  const filtered = users.filter((u) => u.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <form ref={keepFormValues} action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
      <Field label="Atribuir para" htmlFor="as-target">
        <Select id="as-target" name="targetType" value={target} onChange={(ev) => setTarget(ev.target.value)}>
          {Object.entries(ASSIGNMENT_TARGET).map(([k, v]) => (
            <option key={k} value={k}>{k === "USER" ? "Colaboradores selecionados" : v}</option>
          ))}
        </Select>
      </Field>
      {target === "DEPARTMENT" && (
        <Field label="Departamento" htmlFor="as-dep" error={e.departmentId} required>
          <Select id="as-dep" name="departmentId" defaultValue="">
            <option value="">Selecione</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </Select>
        </Field>
      )}
      {target === "POSITION" && (
        <Field label="Cargo" htmlFor="as-pos" error={e.positionId} required>
          <Select id="as-pos" name="positionId" defaultValue="">
            <option value="">Selecione</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </Field>
      )}
      {target === "USER" && (
        <Field label="Colaboradores" htmlFor="as-q" error={e.userIds} required>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input id="as-q" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Filtrar por nome" className="pl-9" />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {filtered.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-navy-50">
                <input type="checkbox" name="userIds" value={u.id} className="size-4 accent-navy-700" />
                {u.label}
              </label>
            ))}
            {filtered.length === 0 && <p className="px-2 py-1 text-xs text-muted">Nenhum colaborador encontrado.</p>}
          </div>
        </Field>
      )}
      <Field label="Prazo (opcional)" htmlFor="as-due" error={e.dueDate} hint="Sem prazo aqui, vale o prazo em dias definido no curso.">
        <Input id="as-due" name="dueDate" type="date" />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="mandatory" defaultChecked className="size-4 accent-navy-700" />
        Obrigatório
      </label>
      <SubmitButton pendingText="Atribuindo...">Atribuir curso</SubmitButton>
    </form>
  );
}
