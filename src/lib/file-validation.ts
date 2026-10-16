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
