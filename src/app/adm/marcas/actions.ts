"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/server/auth/current-user";
import { runAction } from "@/server/actions/run-action";
import { addBrandMaterial, removeBrandMaterial, saveBrand } from "@/server/services/catalog";
import { parseRichDoc } from "@/lib/rich-text";
import { fieldErrors, formToObject, optionalId, optionalText, type ActionState } from "@/lib/validation";

const PERM = "courses.manage" as const;
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

function revalidateBrands() {
  revalidatePath("/adm/marcas", "layout");
  revalidatePath("/academy", "layout");
}

const brandSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(2, "Informe o nome da marca.").max(80),
  summary: optionalText(300),
  website: optionalText(300),
  productLines: z.string().max(1000).optional(),
  active: checkbox,
});

export async function saveBrandAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const actor = await assertPermission(PERM);
    const parsed = brandSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };
    const { id, productLines, ...rest } = parsed.data;
    const lines = (productLines ?? "")
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    const saved = await saveBrand(actor, id, { ...rest, productLines: lines, presentation: parseRichDoc(fd.get("presentation") as string | null) }, fd);
    revalidateBrands();
    return { ok: true, id: saved, message: "Marca salva." };
  });
  if (result.ok && !fd.get("id")) redirect(`/adm/marcas/${result.id}`);
  return result;
}

const materialSchema = z.object({
  brandId: z.string().cuid(),
  title: z.string().trim().min(2, "Informe o título do material.").max(150),
  kind: z.enum(["FILE", "LINK", "VIDEO"]),
  url: optionalText(500),
  fileId: optionalId,
});

export async function addMaterialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    const parsed = materialSchema.safeParse(formToObject(fd));
    if (!parsed.success) return { errors: fieldErrors(parsed.error) };
    const { brandId, ...input } = parsed.data;
    await addBrandMaterial(actor, brandId, input);
    revalidateBrands();
    return { ok: true, message: "Material adicionado." };
  });
}

export async function removeMaterialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertPermission(PERM);
    await removeBrandMaterial(actor, z.string().cuid().parse(fd.get("id")));
    revalidateBrands();
    return { ok: true };
  });
}
