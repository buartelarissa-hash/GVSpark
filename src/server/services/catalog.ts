import "server-only";
import { Prisma, type BrandMaterialKind } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./errors";
import { formFile, saveImageUpload } from "./files";
import { requireReadyFile } from "./uploads";
import { slugify } from "@/lib/slug";
import { parseVideoUrl } from "@/lib/video-embed";
import { safeHref, type RichDoc } from "@/lib/rich-text";
import type { CurrentUser } from "@/server/auth/current-user";

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base);
  let slug = root;
  for (let i = 2; await exists(slug); i++) slug = `${root}-${i}`;
  return slug;
}

function duplicate(e: unknown, message: string, field: string) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return new ServiceError(message, field);
  return e;
}

// ---------------------------------------------------------------- Categorias

export async function listCategories(includeInactive = true) {
  return db.courseCategory.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { courses: { where: { status: "PUBLISHED" } } } } },
  });
}

type CategoryInput = { name: string; description: string | null; icon: string | null; active: boolean };

export async function saveCategory(actor: CurrentUser, id: string | null, input: CategoryInput) {
  try {
    await db.$transaction(async (tx) => {
      const row = id
        ? await tx.courseCategory.update({ where: { id }, data: { ...input, isDemo: false } })
        : await tx.courseCategory.create({
            data: {
              ...input,
              slug: await uniqueSlug(input.name, async (s) => !!(await tx.courseCategory.findUnique({ where: { slug: s } }))),
              order: (await tx.courseCategory.count()) + 1,
            },
          });
      await audit({ actorId: actor.id, action: id ? "category.update" : "category.create", entity: "CourseCategory", entityId: row.id }, tx);
    });
  } catch (e) {
    throw duplicate(e, "Já existe uma categoria com este nome.", "name");
  }
}

// ---------------------------------------------------------------- Marcas parceiras

export async function listBrands(onlyActive: boolean) {
  return db.brand.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { courses: { where: { status: "PUBLISHED" } }, materials: true } } },
  });
}

type BrandInput = {
  name: string;
  summary: string | null;
  presentation: RichDoc | null;
  website: string | null;
  productLines: string[];
  active: boolean;
};

export async function saveBrand(actor: CurrentUser, id: string | null, input: BrandInput, fd: FormData) {
  if (input.website && !safeHref(input.website)) throw new ServiceError("Use um endereço completo, começando com https://", "website");
  const current = id ? await db.brand.findUnique({ where: { id } }) : null;
  if (id && !current) throw new ServiceError("Marca não encontrada.");
  const logo = formFile(fd, "logo");
  const logoUrl = logo ? await saveImageUpload(actor, logo, "marcas") : fd.get("logoRemove") === "1" ? null : (current?.logoUrl ?? null);
  const data = {
    name: input.name,
    summary: input.summary,
    presentation: input.presentation ? (input.presentation as Prisma.InputJsonValue) : Prisma.DbNull,
    website: input.website,
    productLines: input.productLines,
    active: input.active,
    logoUrl,
  };
  try {
    return await db.$transaction(async (tx) => {
      const row = current
        ? await tx.brand.update({ where: { id: current.id }, data: { ...data, isDemo: false } })
        : await tx.brand.create({
            data: { ...data, slug: await uniqueSlug(input.name, async (s) => !!(await tx.brand.findUnique({ where: { slug: s } }))) },
          });
      await audit({ actorId: actor.id, action: current ? "brand.update" : "brand.create", entity: "Brand", entityId: row.id }, tx);
      return row.id;
    });
  } catch (e) {
    throw duplicate(e, "Já existe uma marca com este nome.", "name");
  }
}

type MaterialInput = { title: string; kind: BrandMaterialKind; url: string | null; fileId: string | null };

export async function addBrandMaterial(actor: CurrentUser, brandId: string, input: MaterialInput) {
  if (input.kind === "FILE") {
    if (!input.fileId) throw new ServiceError("Envie o arquivo.", "file");
    await requireReadyFile(input.fileId, ["pdf", "presentation", "document", "image", "video"], null);
  } else if (input.kind === "VIDEO") {
    if (!parseVideoUrl(input.url)) throw new ServiceError("Use um link do YouTube ou Vimeo.", "url");
  } else if (!input.url || !safeHref(input.url)) {
    throw new ServiceError("Use um link completo, começando com https://", "url");
  }
  const order = (await db.brandMaterial.count({ where: { brandId } })) + 1;
  const row = await db.brandMaterial.create({
    data: { brandId, title: input.title, kind: input.kind, url: input.kind === "FILE" ? null : input.url, fileId: input.kind === "FILE" ? input.fileId : null, order },
  });
  await audit({ actorId: actor.id, action: "brand.material.add", entity: "BrandMaterial", entityId: row.id });
}

export async function removeBrandMaterial(actor: CurrentUser, id: string) {
  await db.brandMaterial.delete({ where: { id } });
  await audit({ actorId: actor.id, action: "brand.material.remove", entity: "BrandMaterial", entityId: id });
}
