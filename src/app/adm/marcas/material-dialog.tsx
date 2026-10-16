"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { FileUpload } from "@/components/content/file-upload";
import { addMaterialAction } from "./actions";

export function MaterialDialog({ brandId }: { brandId: string }) {
  const [kind, setKind] = React.useState("FILE");
  return (
    <FormDialog
      title="Novo material"
      description="Fichas técnicas, catálogos, apresentações e vídeos da marca."
      action={addMaterialAction}
      className="max-w-xl"
      trigger={
        <Button size="sm">
          <Plus /> Novo material
        </Button>
      }
    >
      {(e) => (
        <>
          <input type="hidden" name="brandId" value={brandId} />
          <Field label="Título" htmlFor="mt-title" error={e.title} required>
            <Input id="mt-title" name="title" maxLength={150} required placeholder="Ex.: Ficha técnica — Linha X" aria-invalid={!!e.title} />
          </Field>
          <Field label="Tipo" htmlFor="mt-kind">
            <Select id="mt-kind" name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)}>
              <option value="FILE">Arquivo (PDF, apresentação, documento, vídeo)</option>
              <option value="LINK">Link externo</option>
              <option value="VIDEO">Vídeo do YouTube/Vimeo</option>
            </Select>
          </Field>
          {kind === "FILE" ? (
            <Field label="Arquivo" htmlFor="mt-file" error={e.file ?? e.fileId} required>
              <FileUpload id="mt-file" name="fileId" kinds={["pdf", "presentation", "document", "image", "video"]} target={{ type: "brand" }} invalid={!!(e.file ?? e.fileId)} />
            </Field>
          ) : (
            <Field label="Endereço" htmlFor="mt-url" error={e.url} required>
              <Input id="mt-url" name="url" type="url" placeholder="https://" aria-invalid={!!e.url} />
            </Field>
          )}
        </>
      )}
    </FormDialog>
  );
}
