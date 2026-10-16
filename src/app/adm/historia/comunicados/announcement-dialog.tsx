"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { saveAnnouncementAction } from "../actions";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  expiresAt: string;
  pinned: boolean;
};

export function AnnouncementDialog({ item }: { item?: AnnouncementItem }) {
  return (
    <FormDialog
      title={item ? "Editar comunicado" : "Novo comunicado"}
      description="Os comunicados publicados aparecem na página inicial de todos os colaboradores."
      action={saveAnnouncementAction}
      className="max-w-xl"
      trigger={
        item ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${item.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Novo comunicado
          </Button>
        )
      }
    >
      {(e) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          {item?.publishedAt && <input type="hidden" name="currentPublishedAt" value={item.publishedAt} />}
          <Field label="Título" htmlFor="an-title" error={e.title} required>
            <Input id="an-title" name="title" defaultValue={item?.title} maxLength={150} required aria-invalid={!!e.title} />
          </Field>
          <Field label="Mensagem" htmlFor="an-body" error={e.body} required>
            <Textarea id="an-body" name="body" defaultValue={item?.body} maxLength={4000} rows={6} required aria-invalid={!!e.body} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publicação" htmlFor="an-mode" error={e.publishMode}>
              <Select id="an-mode" name="publishMode" defaultValue={item?.publishedAt ? "keep" : "now"}>
                {item?.publishedAt && <option value="keep">Manter publicado</option>}
                <option value="now">{item?.publishedAt ? "Republicar agora (volta ao topo)" : "Publicar agora"}</option>
                <option value="draft">Salvar como rascunho</option>
              </Select>
            </Field>
            <Field label="Exibir até (opcional)" htmlFor="an-exp" error={e.expiresAt}>
              <Input id="an-exp" name="expiresAt" type="date" defaultValue={item?.expiresAt} aria-invalid={!!e.expiresAt} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="pinned" defaultChecked={item?.pinned} className="size-4 accent-navy-700" />
            Fixar no topo
          </label>
        </>
      )}
    </FormDialog>
  );
}
