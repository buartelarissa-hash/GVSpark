"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ImageInput } from "@/components/content/image-input";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { keepFormValues } from "@/lib/forms";
import { saveBrandAction } from "./actions";

export type BrandDefaults = {
  id: string;
  name: string;
  summary: string | null;
  presentation: unknown;
  website: string | null;
  productLines: string[];
  logoUrl: string | null;
  active: boolean;
};

export function BrandForm({ brand }: { brand?: BrandDefaults }) {
  const [state, action] = useActionState(saveBrandAction, {});
  const e = state.errors ?? {};
  return (
    <form ref={keepFormValues} action={action} className="space-y-6">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-5">
          <Field label="Nome da marca" htmlFor="br-name" error={e.name} required>
            <Input id="br-name" name="name" defaultValue={brand?.name} maxLength={80} required aria-invalid={!!e.name} />
          </Field>
          <Field label="Descrição curta" htmlFor="br-sum" error={e.summary} hint="Aparece no card da marca.">
            <Textarea id="br-sum" name="summary" defaultValue={brand?.summary ?? ""} maxLength={300} rows={2} />
          </Field>
          <Field label="Site oficial" htmlFor="br-web" error={e.website}>
            <Input id="br-web" name="website" type="url" defaultValue={brand?.website ?? ""} placeholder="https://" aria-invalid={!!e.website} />
          </Field>
          <Field label="Categorias de produtos" htmlFor="br-lines" error={e.productLines} hint="Separe por vírgula. Ex.: Adesivos instantâneos, Selantes, Fitas">
            <Input id="br-lines" name="productLines" defaultValue={brand?.productLines.join(", ") ?? ""} maxLength={1000} />
          </Field>
        </div>
        <Field label="Logo" htmlFor="br-logo" error={e.image}>
          <ImageInput id="br-logo" name="logo" currentUrl={brand?.logoUrl} aspect="aspect-[3/2]" invalid={!!e.image} />
        </Field>
      </div>
      <Field label="Apresentação da marca" htmlFor="br-pres">
        <RichTextEditor id="br-pres" name="presentation" defaultValue={brand?.presentation ?? undefined} minHeight="12rem" />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={brand?.active ?? true} className="size-4 accent-navy-700" />
        Ativa — exibir na página de marcas parceiras
      </label>
      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <SubmitButton pendingText="Salvando...">{brand ? "Salvar alterações" : "Cadastrar marca"}</SubmitButton>
        <Button asChild variant="outline">
          <Link href="/adm/marcas">Voltar</Link>
        </Button>
      </div>
    </form>
  );
}
