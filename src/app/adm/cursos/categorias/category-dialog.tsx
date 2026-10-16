"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { CATEGORY_ICONS } from "@/components/content/category-icon";
import { saveCategoryAction } from "../actions";

export type CategoryData = { id: string; name: string; description: string | null; icon: string | null; active: boolean };

export function CategoryDialog({ category }: { category?: CategoryData }) {
  return (
    <FormDialog
      title={category ? "Editar categoria" : "Nova categoria"}
      action={saveCategoryAction}
      trigger={
        category ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${category.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Nova categoria
          </Button>
        )
      }
    >
      {(e) => (
        <>
          {category && <input type="hidden" name="id" value={category.id} />}
          <Field label="Nome" htmlFor="cat-name" error={e.name} required>
            <Input id="cat-name" name="name" defaultValue={category?.name} maxLength={80} required placeholder="Ex.: Adesivos e selantes" aria-invalid={!!e.name} />
          </Field>
          <Field label="Descrição" htmlFor="cat-desc" error={e.description}>
            <Input id="cat-desc" name="description" defaultValue={category?.description ?? ""} maxLength={300} />
          </Field>
          <Field label="Ícone" htmlFor="cat-icon">
            <Select id="cat-icon" name="icon" defaultValue={category?.icon ?? "book"}>
              {Object.entries(CATEGORY_ICONS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={category?.active ?? true} className="size-4 accent-navy-700" />
            Ativa
          </label>
        </>
      )}
    </FormDialog>
  );
}
