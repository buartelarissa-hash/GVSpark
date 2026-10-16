"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ImageInput } from "@/components/content/image-input";
import { saveTimelineAction } from "../actions";

export type TimelineItem = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  highlight: boolean;
  published: boolean;
};

export function TimelineDialog({ item }: { item?: TimelineItem }) {
  return (
    <FormDialog
      title={item ? "Editar marco" : "Novo marco"}
      description="Datas aproximadas podem usar o dia 1º do mês ou do ano."
      action={saveTimelineAction}
      className="max-w-xl"
      trigger={
        item ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${item.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Novo marco
          </Button>
        )
      }
    >
      {(e) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Data" htmlFor="tl-date" error={e.date} required>
              <Input id="tl-date" name="date" type="date" defaultValue={item?.date} required aria-invalid={!!e.date} />
            </Field>
            <Field label="Título" htmlFor="tl-title" error={e.title} required>
              <Input id="tl-title" name="title" defaultValue={item?.title} maxLength={120} required aria-invalid={!!e.title} />
            </Field>
          </div>
          <Field label="Descrição" htmlFor="tl-desc" error={e.description}>
            <Textarea id="tl-desc" name="description" defaultValue={item?.description ?? ""} maxLength={1000} />
          </Field>
          <Field label="Fotografia (opcional)" htmlFor="tl-image" error={e.image}>
            <ImageInput id="tl-image" name="image" currentUrl={item?.imageUrl} invalid={!!e.image} />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="highlight" defaultChecked={item?.highlight} className="size-4 accent-navy-700" />
              Marco de destaque
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="published" defaultChecked={item?.published ?? true} className="size-4 accent-navy-700" />
              Publicado
            </label>
          </div>
        </>
      )}
    </FormDialog>
  );
}
