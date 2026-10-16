import { z } from "zod";
import type { LessonBlockType } from "@prisma/client";
import { sanitizeRichDoc, safeHref, type RichDoc } from "./rich-text";
import { parseVideoUrl } from "./video-embed";
import type { FileKind } from "./file-validation";

/** Metadados de cada tipo de bloco de aula. */
export const BLOCK_TYPES: { type: LessonBlockType; label: string; description: string; fileKinds?: FileKind[] }[] = [
  { type: "RICH_TEXT", label: "Texto", description: "Texto formatado com títulos, listas e links." },
  { type: "IMAGE", label: "Imagem", description: "Foto ou ilustração com legenda.", fileKinds: ["image"] },
  { type: "VIDEO_UPLOAD", label: "Vídeo (arquivo)", description: "Envie um vídeo MP4, MOV ou WEBM.", fileKinds: ["video"] },
  { type: "VIDEO_EMBED", label: "Vídeo (YouTube/Vimeo)", description: "Incorpore um vídeo por link." },
  { type: "PDF", label: "PDF", description: "Documento PDF exibido na aula.", fileKinds: ["pdf"] },
  { type: "PRESENTATION", label: "Apresentação", description: "PowerPoint (download) ou PDF (exibido na aula).", fileKinds: ["presentation", "pdf"] },
  { type: "LINK", label: "Link externo", description: "Site, catálogo ou material on-line." },
  { type: "ACTIVITY", label: "Atividade", description: "Exercício ou reflexão proposta ao colaborador." },
  { type: "ATTACHMENT", label: "Material complementar", description: "Arquivo para download.", fileKinds: ["pdf", "presentation", "document", "image", "video"] },
];

export const BLOCK_LABEL = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label])) as Record<LessonBlockType, string>;

export function fileKindsFor(type: LessonBlockType): FileKind[] | null {
  return BLOCK_TYPES.find((b) => b.type === type)?.fileKinds ?? null;
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const docSchema = z.unknown().transform((v, ctx): RichDoc | null => {
  const doc = sanitizeRichDoc(v);
  if (v != null && !doc) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Escreva o conteúdo." });
    return z.NEVER;
  }
  return doc;
});

const fileId = z.string().cuid({ message: "Envie o arquivo." });

const schemas = {
  RICH_TEXT: z.object({ doc: docSchema.refine((d) => d !== null, "Escreva o conteúdo.") }),
  IMAGE: z.object({ fileId, caption: optText(300), alt: optText(300) }),
  VIDEO_UPLOAD: z.object({ fileId, title: optText(150) }),
  VIDEO_EMBED: z.object({
    url: z.string().trim().refine((u) => parseVideoUrl(u) !== null, "Use um link do YouTube ou Vimeo."),
    title: optText(150),
  }),
  PDF: z.object({ fileId, title: optText(150) }),
  PRESENTATION: z.object({ fileId, title: optText(150) }),
  LINK: z.object({
    url: z.string().trim().refine((u) => safeHref(u) !== null && u.startsWith("http"), "Use um link completo, começando com https://"),
    title: z.string().trim().min(2, "Informe o título do link.").max(150),
    description: optText(500),
  }),
  ACTIVITY: z.object({
    title: z.string().trim().min(2, "Informe o título da atividade.").max(150),
    instructions: docSchema.refine((d) => d !== null, "Descreva a atividade."),
  }),
  ATTACHMENT: z.object({ fileId, title: optText(150), description: optText(500) }),
} satisfies Record<LessonBlockType, z.ZodTypeAny>;

export type BlockContent<T extends LessonBlockType = LessonBlockType> = z.infer<(typeof schemas)[T]>;

/** Valida e normaliza o conteúdo de um bloco. */
export function parseBlockContent(type: LessonBlockType, raw: unknown) {
  return schemas[type].safeParse(raw);
}

/** Id do arquivo usado pelo bloco (se houver). */
export function blockFileId(content: unknown): string | null {
  const id = (content as { fileId?: unknown } | null)?.fileId;
  return typeof id === "string" ? id : null;
}
