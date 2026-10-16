"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { saveOrgPositionAction } from "./actions";

type Opt = { id: string; label: string };

export type OrgNodeData = {
  id: string;
  title: string;
  responsibilities: string | null;
  parentId: string | null;
  departmentId: string | null;
  userId: string | null;
};

export function OrgDialog({
  node,
  parentId,
  parents,
  departments,
  users,
  variant = "root",
}: {
  node?: OrgNodeData;
  /** Posição superior pré-selecionada (ao adicionar subordinado). */
  parentId?: string;
  /** Posições que podem ser superiores (já sem o próprio nó e descendentes). */
  parents: Opt[];
  departments: Opt[];
  users: Opt[];
  variant?: "root" | "child" | "edit";
}) {
  const trigger =
    variant === "edit" ? (
      <Button variant="ghost" size="icon" aria-label={`Editar ${node?.title}`}>
        <Pencil />
      </Button>
    ) : variant === "child" ? (
      <Button variant="ghost" size="icon" aria-label="Adicionar posição subordinada" title="Adicionar subordinado">
        <Plus />
      </Button>
    ) : (
      <Button size="sm">
        <Plus /> Nova posição
      </Button>
    );

  return (
    <FormDialog title={node ? "Editar posição" : "Nova posição"} action={saveOrgPositionAction} trigger={trigger} className="max-w-xl">
      {(e) => (
        <>
          {node && <input type="hidden" name="id" value={node.id} />}
          <Field label="Título da posição" htmlFor="org-title" error={e.title} required hint="Ex.: Gerente comercial, Supervisor de logística.">
            <Input id="org-title" name="title" defaultValue={node?.title} maxLength={100} required aria-invalid={!!e.title} />
          </Field>
          <Field label="Ocupante" htmlFor="org-user" error={e.userId} hint="Deixe em branco para indicar uma posição vaga.">
            <Select id="org-user" name="userId" defaultValue={node?.userId ?? ""}>
              <option value="">Posição vaga</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responde a" htmlFor="org-parent" error={e.parentId}>
              <Select id="org-parent" name="parentId" defaultValue={node?.parentId ?? parentId ?? ""} aria-invalid={!!e.parentId}>
                <option value="">Topo do organograma</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Departamento" htmlFor="org-dep" error={e.departmentId}>
              <Select id="org-dep" name="departmentId" defaultValue={node?.departmentId ?? ""}>
                <option value="">Não definido</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Responsabilidades" htmlFor="org-resp" error={e.responsibilities}>
            <Textarea id="org-resp" name="responsibilities" defaultValue={node?.responsibilities ?? ""} maxLength={2000} rows={5} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
