"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, X } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { savePathAction } from "../actions";

type Opt = { id: string; label: string };
export type PathData = { id: string; name: string; description: string | null; positionId: string | null; autoAssign: boolean; courseIds: string[] };

export function PathDialog({ path, positions, courses }: { path?: PathData; positions: Opt[]; courses: Opt[] }) {
  const [selected, setSelected] = React.useState<string[]>(path?.courseIds ?? []);
  const [pick, setPick] = React.useState("");
  const label = (id: string) => courses.find((c) => c.id === id)?.label ?? "Curso";
  const move = (i: number, d: -1 | 1) =>
    setSelected((s) => {
      const n = [...s];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  return (
    <FormDialog
      title={path ? "Editar trilha" : "Nova trilha de aprendizagem"}
      description="Ao cadastrar alguém no cargo, os cursos da trilha são atribuídos automaticamente."
      action={savePathAction}
      className="max-w-xl"
      trigger={
        path ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${path.name}`}>
            <Pencil />
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
          {path && <input type="hidden" name="id" value={path.id} />}
          <Field label="Nome" htmlFor="pa-name" error={e.name} required>
            <Input id="pa-name" name="name" defaultValue={path?.name} maxLength={100} required placeholder="Ex.: Formação de vendedor interno" aria-invalid={!!e.name} />
          </Field>
          <Field label="Descrição" htmlFor="pa-desc" error={e.description}>
            <Textarea id="pa-desc" name="description" defaultValue={path?.description ?? ""} maxLength={500} rows={2} />
          </Field>
          <Field label="Cargo" htmlFor="pa-pos" error={e.positionId}>
            <Select id="pa-pos" name="positionId" defaultValue={path?.positionId ?? ""} aria-invalid={!!e.positionId}>
              <option value="">Nenhum</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="autoAssign" defaultChecked={path?.autoAssign ?? true} className="size-4 accent-navy-700" />
            Atribuir automaticamente (como obrigatório) a quem ocupa o cargo
          </label>
          <Field label="Cursos, na ordem sugerida" htmlFor="pa-pick" error={e.courseIds} required>
            <div className="flex gap-2">
              <Select id="pa-pick" value={pick} onChange={(ev) => setPick(ev.target.value)}>
                <option value="">Escolha um curso</option>
                {courses.filter((c) => !selected.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
              <Button type="button" variant="outline" disabled={!pick} onClick={() => { setSelected((s) => [...s, pick]); setPick(""); }}>
                Adicionar
              </Button>
            </div>
          </Field>
          <ol className="space-y-1.5">
            {selected.map((id, i) => (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                <input type="hidden" name="courseIds" value={id} />
                <span className="w-5 text-xs font-bold text-navy-600">{i + 1}.</span>
                <span className="flex-1 truncate">{label(id)}</span>
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={i === selected.length - 1} onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelected((s) => s.filter((x) => x !== id))} aria-label="Remover"><X /></Button>
              </li>
            ))}
          </ol>
        </>
      )}
    </FormDialog>
  );
}
