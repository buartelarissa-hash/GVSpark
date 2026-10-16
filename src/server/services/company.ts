import "server-only";
import type { CompanySectionType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "./audit";
import { ServiceError } from "./users";
import { formFile, saveImageUpload } from "./files";
import { parseVideoUrl } from "@/lib/video-embed";
import type { RichDoc } from "@/lib/rich-text";
import type { CurrentUser } from "@/server/auth/current-user";

// ---------------------------------------------------------------- Seções

export async function listSectionsForAdmin() {
  return db.companySection.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
}

export async function publishedSections() {
  return db.companySection.findMany({ where: { published: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
}

type SectionInput = {
  type: CompanySectionType;
  title: string;
  body: RichDoc | null;
  videoUrl: string | null;
  published: boolean;
};

/** Resolve a imagem do formulário: nova imagem, remoção, ou mantém a atual. */
async function resolveImage(actor: CurrentUser, fd: FormData, field: string, current: string | null, folder: string) {
  const file = formFile(fd, field);
  if (file) return saveImageUpload(actor, file, folder);
  if (fd.get(`${field}Remove`) === "1") return null;
  return current;
}

export async function saveSection(actor: CurrentUser, id: string | null, input: SectionInput, fd: FormData) {
  const current = id ? await db.companySection.findUnique({ where: { id } }) : null;
  if (id && !current) throw new ServiceError("Seção não encontrada.");

  let mediaUrl: string | null;
  if (input.type === "VIDEO") {
    if (!input.videoUrl || !parseVideoUrl(input.videoUrl)) {
      throw new ServiceError("Informe um link válido do YouTube ou Vimeo.", "videoUrl");
    }
    mediaUrl = input.videoUrl;
  } else {
    if (!input.body) throw new ServiceError("Escreva o conteúdo da seção.", "body");
    mediaUrl = await resolveImage(actor, fd, "image", current?.type === "VIDEO" ? null : (current?.mediaUrl ?? null), "historia");
  }

  const data = {
    type: input.type,
    title: input.title,
    body: (input.body ?? undefined) as Prisma.InputJsonValue | undefined,
    mediaUrl,
    published: input.published,
  };
  const saved = await db.$transaction(async (tx) => {
    const row = current
      ? await tx.companySection.update({ where: { id: current.id }, data: { ...data, isDemo: false } })
      : await tx.companySection.create({
          data: { ...data, order: (await tx.companySection.count({ where: { type: input.type } })) + 1 },
        });
    await audit(
      { actorId: actor.id, action: current ? "section.update" : "section.create", entity: "CompanySection", entityId: row.id },
      tx,
    );
    return row;
  });
  return saved.id;
}

export async function deleteSection(actor: CurrentUser, id: string) {
  await db.$transaction(async (tx) => {
    await tx.companySection.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "section.delete", entity: "CompanySection", entityId: id }, tx);
  });
}

export async function setSectionPublished(actor: CurrentUser, id: string, published: boolean) {
  await db.$transaction(async (tx) => {
    await tx.companySection.update({ where: { id }, data: { published } });
    await audit(
      { actorId: actor.id, action: published ? "section.publish" : "section.unpublish", entity: "CompanySection", entityId: id },
      tx,
    );
  });
}

/** Move a seção uma posição para cima/baixo dentro do mesmo tipo. */
export async function moveSection(actor: CurrentUser, id: string, direction: "up" | "down") {
  const section = await db.companySection.findUnique({ where: { id } });
  if (!section) throw new ServiceError("Seção não encontrada.");
  const siblings = await db.companySection.findMany({
    where: { type: section.type },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const idx = siblings.findIndex((s) => s.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= siblings.length) return;
  [siblings[idx], siblings[swap]] = [siblings[swap], siblings[idx]];
  await db.$transaction(siblings.map((s, i) => db.companySection.update({ where: { id: s.id }, data: { order: i + 1 } })));
  await audit({ actorId: actor.id, action: "section.reorder", entity: "CompanySection", entityId: id });
}

// ---------------------------------------------------------------- Linha do tempo

type TimelineInput = { date: Date; title: string; description: string | null; highlight: boolean; published: boolean };

export async function listTimeline(onlyPublished: boolean) {
  return db.timelineEvent.findMany({
    where: onlyPublished ? { published: true } : undefined,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function saveTimelineEvent(actor: CurrentUser, id: string | null, input: TimelineInput, fd: FormData) {
  const current = id ? await db.timelineEvent.findUnique({ where: { id } }) : null;
  if (id && !current) throw new ServiceError("Marco não encontrado.");
  const imageUrl = await resolveImage(actor, fd, "image", current?.imageUrl ?? null, "linha-do-tempo");
  await db.$transaction(async (tx) => {
    const row = current
      ? await tx.timelineEvent.update({ where: { id: current.id }, data: { ...input, imageUrl, isDemo: false } })
      : await tx.timelineEvent.create({ data: { ...input, imageUrl } });
    await audit(
      { actorId: actor.id, action: current ? "timeline.update" : "timeline.create", entity: "TimelineEvent", entityId: row.id },
      tx,
    );
  });
}

export async function deleteTimelineEvent(actor: CurrentUser, id: string) {
  await db.$transaction(async (tx) => {
    await tx.timelineEvent.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "timeline.delete", entity: "TimelineEvent", entityId: id }, tx);
  });
}

// ---------------------------------------------------------------- Comunicados

type AnnouncementInput = {
  title: string;
  body: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
  pinned: boolean;
};

export async function listAnnouncements() {
  return db.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
}

export async function saveAnnouncement(actor: CurrentUser, id: string | null, input: AnnouncementInput) {
  if (input.publishedAt && input.expiresAt && input.expiresAt <= input.publishedAt) {
    throw new ServiceError("A data de expiração deve ser posterior à publicação.", "expiresAt");
  }
  await db.$transaction(async (tx) => {
    const row = id
      ? await tx.announcement.update({ where: { id }, data: { ...input, isDemo: false } })
      : await tx.announcement.create({ data: { ...input, authorId: actor.id } });
    await audit(
      { actorId: actor.id, action: id ? "announcement.update" : "announcement.create", entity: "Announcement", entityId: row.id },
      tx,
    );
  });
}

export async function deleteAnnouncement(actor: CurrentUser, id: string) {
  await db.$transaction(async (tx) => {
    await tx.announcement.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "announcement.delete", entity: "Announcement", entityId: id }, tx);
  });
}
