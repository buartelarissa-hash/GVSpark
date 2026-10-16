import { describe, expect, it } from "vitest";
import { classifyFile, expectedKind, maxBytesFor } from "@/lib/file-validation";
import { parseBlockContent, fileKindsFor } from "@/lib/lesson-blocks";
import { slugify } from "@/lib/slug";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

const PDF = bytes("%PDF-1.7\n");
const MP4 = bytes([0, 0, 0, 0x20], "ftypisom", [0, 0, 0, 0]);
const WEBM = bytes([0x1a, 0x45, 0xdf, 0xa3, 0, 0]);
const ZIP = bytes([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const EXE = bytes("MZ\x90\x00");

describe("classificação de arquivos da Academy", () => {
  const all = ["image", "pdf", "presentation", "document", "video"] as const;
  it("aceita arquivos cujo conteúdo bate com a extensão", () => {
    expect(classifyFile("manual.pdf", PDF, 1000, [...all])).toMatchObject({ ok: true, kind: "pdf" });
    expect(classifyFile("aula.mp4", MP4, 1000, [...all])).toMatchObject({ ok: true, kind: "video", mime: "video/mp4" });
    expect(classifyFile("aula.webm", WEBM, 1000, [...all])).toMatchObject({ ok: true, kind: "video" });
    expect(classifyFile("slides.pptx", ZIP, 1000, [...all])).toMatchObject({ ok: true, kind: "presentation" });
    expect(classifyFile("planilha.xlsx", ZIP, 1000, [...all])).toMatchObject({ ok: true, kind: "document" });
  });
  it("recusa conteúdo disfarçado", () => {
    expect(classifyFile("virus.pdf", EXE, 1000, [...all]).ok).toBe(false);
    expect(classifyFile("video.mp4", PDF, 1000, [...all]).ok).toBe(false);
    expect(classifyFile("script.exe", EXE, 1000, [...all]).ok).toBe(false);
    expect(classifyFile("pagina.html", bytes("<html>"), 1000, [...all]).ok).toBe(false);
  });
  it("respeita os tipos permitidos e os limites de tamanho", () => {
    expect(classifyFile("manual.pdf", PDF, 1000, ["video"]).ok).toBe(false);
    expect(classifyFile("manual.pdf", PDF, maxBytesFor("pdf") + 1, ["pdf"]).ok).toBe(false);
    expect(maxBytesFor("video", { MAX_VIDEO_MB: "200" })).toBe(200 * 1024 * 1024);
  });
  it("identifica o tipo esperado pela extensão", () => {
    expect(expectedKind("Aula 1.MOV")?.kind).toBe("video");
    expect(expectedKind("foto.jpeg")?.mime).toBe("image/jpeg");
    expect(expectedKind("arquivo")).toBeNull();
  });
});

describe("blocos de aula", () => {
  const id = "ckabcdefghijklmnopqrstuvw";
  it("valida cada tipo de bloco", () => {
    expect(parseBlockContent("VIDEO_EMBED", { url: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
    expect(parseBlockContent("VIDEO_EMBED", { url: "https://site.com/video" }).success).toBe(false);
    expect(parseBlockContent("LINK", { url: "javascript:alert(1)", title: "x y" }).success).toBe(false);
    expect(parseBlockContent("LINK", { url: "https://gigavale.com.br", title: "Site" }).success).toBe(true);
    expect(parseBlockContent("PDF", { fileId: "" }).success).toBe(false);
    expect(parseBlockContent("PDF", { fileId: id }).success).toBe(true);
    expect(parseBlockContent("RICH_TEXT", { doc: { type: "doc", content: [] } }).success).toBe(false);
    expect(parseBlockContent("ACTIVITY", { title: "Atividade", instructions: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Faça" }] }] } }).success).toBe(true);
  });
  it("saneia o texto dos blocos", () => {
    const r = parseBlockContent("RICH_TEXT", { doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }] }] } });
    expect(r.success && JSON.stringify(r.data)).not.toContain("javascript");
  });
  it("define os arquivos aceitos por bloco", () => {
    expect(fileKindsFor("VIDEO_UPLOAD")).toEqual(["video"]);
    expect(fileKindsFor("PRESENTATION")).toEqual(["presentation", "pdf"]);
    expect(fileKindsFor("LINK")).toBeNull();
  });
});

describe("slug", () => {
  it("gera endereços legíveis", () => {
    expect(slugify("Especialista em Adesivos!")).toBe("especialista-em-adesivos");
    expect(slugify("Elétrica & Hidráulica")).toBe("eletrica-hidraulica");
    expect(slugify("!!!")).toBe("item");
  });
});
