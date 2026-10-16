/**
 * Validação de uploads pelo CONTEÚDO do arquivo (assinatura binária),
 * não pela extensão ou pelo tipo informado pelo navegador.
 */
export type DetectedType = { mime: string; ext: string };

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function detectImageType(bytes: Uint8Array): DetectedType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return { mime: "image/png", ext: "png" };
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61)
    return { mime: "image/gif", ext: "gif" };
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return { mime: "image/webp", ext: "webp" };
  return null;
}

export function validateImage(bytes: Uint8Array): { ok: true; type: DetectedType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "O arquivo está vazio." };
  if (bytes.length > IMAGE_MAX_BYTES) return { ok: false, error: "A imagem deve ter no máximo 5 MB." };
  const type = detectImageType(bytes);
  if (!type) return { ok: false, error: "Formato não aceito. Envie uma imagem JPG, PNG, WEBP ou GIF." };
  return { ok: true, type };
}

/** Nome de arquivo seguro para exibição/download. */
export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().slice(0, 120);
  return cleaned || "arquivo";
}

// ---------------------------------------------------------------- Arquivos da Academy

export type FileKind = "image" | "pdf" | "presentation" | "document" | "video";

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  image: "imagem",
  pdf: "PDF",
  presentation: "apresentação",
  document: "documento",
  video: "vídeo",
};

const MB = 1024 * 1024;

/** Tamanho máximo por tipo (vídeo configurável por MAX_VIDEO_MB, padrão 1 GB). */
export function maxBytesFor(kind: FileKind, env: Record<string, string | undefined> = {}): number {
  switch (kind) {
    case "image":
      return 5 * MB;
    case "pdf":
      return 50 * MB;
    case "presentation":
      return 150 * MB;
    case "document":
      return 50 * MB;
    case "video":
      return (Number(env.MAX_VIDEO_MB) || 1024) * MB;
  }
}

type Rule = { ext: string[]; mime: string; kind: FileKind; magic: (b: Uint8Array) => boolean };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));
const isZip = (b: Uint8Array) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]);
const isOle = (b: Uint8Array) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isFtyp = (b: Uint8Array) => b.length >= 12 && ascii(b, 4, 8) === "ftyp";

const RULES: Rule[] = [
  { ext: ["pdf"], mime: "application/pdf", kind: "pdf", magic: (b) => ascii(b, 0, 5) === "%PDF-" },
  { ext: ["pptx"], mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "presentation", magic: isZip },
  { ext: ["ppt"], mime: "application/vnd.ms-powerpoint", kind: "presentation", magic: isOle },
  { ext: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document", magic: isZip },
  { ext: ["xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "document", magic: isZip },
  { ext: ["doc"], mime: "application/msword", kind: "document", magic: isOle },
  { ext: ["xls"], mime: "application/vnd.ms-excel", kind: "document", magic: isOle },
  { ext: ["mp4", "m4v"], mime: "video/mp4", kind: "video", magic: (b) => isFtyp(b) && ascii(b, 8, 10) !== "qt" },
  { ext: ["mov"], mime: "video/quicktime", kind: "video", magic: isFtyp },
  { ext: ["webm"], mime: "video/webm", kind: "video", magic: (b) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]) },
];

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Tipo esperado pela extensão do nome (checagem prévia, antes do upload). */
export function expectedKind(fileName: string): { kind: FileKind; mime: string; ext: string } | null {
  const ext = extensionOf(fileName);
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return { kind: "image", mime: ext === "jpg" ? "image/jpeg" : `image/${ext}`, ext: ext === "jpeg" ? "jpg" : ext };
  }
  const rule = RULES.find((r) => r.ext.includes(ext));
  return rule ? { kind: rule.kind, mime: rule.mime, ext } : null;
}

/**
 * Confirma o tipo pelo conteúdo (primeiros bytes) + extensão. A extensão escolhe a
 * regra; os bytes precisam bater com ela. Retorna o tipo final ou mensagem de erro.
 */
export function classifyFile(
  fileName: string,
  head: Uint8Array,
  size: number,
  allowed: FileKind[],
  env: Record<string, string | undefined> = {},
): { ok: true; kind: FileKind; mime: string; ext: string } | { ok: false; error: string } {
  const expected = expectedKind(fileName);
  const allowedText = allowed.map((k) => FILE_KIND_LABELS[k]).join(", ");
  if (!expected || !allowed.includes(expected.kind)) return { ok: false, error: `Tipo de arquivo não aceito aqui. Envie: ${allowedText}.` };
  if (size <= 0) return { ok: false, error: "O arquivo está vazio." };
  const max = maxBytesFor(expected.kind, env);
  if (size > max) return { ok: false, error: `O arquivo excede o limite de ${Math.round(max / MB)} MB para ${FILE_KIND_LABELS[expected.kind]}.` };
  if (expected.kind === "image") {
    const img = detectImageType(head);
    if (!img) return { ok: false, error: "O conteúdo do arquivo não corresponde a uma imagem válida." };
    return { ok: true, kind: "image", mime: img.mime, ext: img.ext };
  }
  const rule = RULES.find((r) => r.ext.includes(expected.ext))!;
  if (!rule.magic(head)) return { ok: false, error: `O conteúdo do arquivo não corresponde a um ${FILE_KIND_LABELS[rule.kind]} válido.` };
  return { ok: true, kind: rule.kind, mime: rule.mime, ext: expected.ext };
}

/** Tipos exibidos no navegador; os demais são baixados. */
export function isInlineMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/") || mime === "application/pdf";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * MB) return `${(n / MB).toFixed(1).replace(".", ",")} MB`;
  return `${(n / (1024 * MB)).toFixed(2).replace(".", ",")} GB`;
}

/** Valor do atributo `accept` do input de arquivo para os tipos permitidos. */
export function acceptAttr(kinds: FileKind[]): string {
  const map: Record<FileKind, string[]> = {
    image: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    pdf: [".pdf"],
    presentation: [".pptx", ".ppt", ".pdf"],
    document: [".docx", ".xlsx", ".doc", ".xls"],
    video: [".mp4", ".m4v", ".mov", ".webm"],
  };
  return [...new Set(kinds.flatMap((k) => map[k]))].join(",");
}
