import { describe, expect, it } from "vitest";
import { parseRichDoc, richDocToText, sanitizeRichDoc, textToRichDoc } from "@/lib/rich-text";
import { parseVideoUrl } from "@/lib/video-embed";
import { canCompleteManually, computeOnboarding, defaultStepRows, type StepInput } from "@/lib/onboarding";
import { buildTree, descendantIds, wouldCreateCycle } from "@/lib/org-tree";
import { detectImageType, safeFileName, validateImage } from "@/lib/file-validation";

describe("texto formatado (saneamento)", () => {
  it("mantém formatação permitida", () => {
    const doc = sanitizeRichDoc({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título" }] },
        { type: "paragraph", content: [{ type: "text", text: "negrito", marks: [{ type: "bold" }] }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }] }] },
      ],
    });
    expect(doc?.content).toHaveLength(3);
    expect(richDocToText(doc)).toContain("negrito");
  });

  it("remove nós desconhecidos, atributos estranhos e links perigosos", () => {
    const doc = sanitizeRichDoc({
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        {
          type: "paragraph",
          attrs: { onclick: "x" },
          content: [
            { type: "text", text: "ruim", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
            { type: "text", text: " bom", marks: [{ type: "link", attrs: { href: "https://gigavale.com.br", target: "_self" } }] },
          ],
        },
      ],
    });
    expect(JSON.stringify(doc)).not.toContain("script");
    expect(JSON.stringify(doc)).not.toContain("javascript");
    expect(JSON.stringify(doc)).not.toContain("onclick");
    expect(JSON.stringify(doc)).toContain("https://gigavale.com.br");
    expect(JSON.stringify(doc)).not.toContain("_self");
  });

  it("documento vazio ou inválido vira null", () => {
    expect(parseRichDoc('{"type":"doc","content":[{"type":"paragraph"}]}')).toBeNull();
    expect(parseRichDoc("não é json")).toBeNull();
    expect(parseRichDoc('{"type":"x"}')).toBeNull();
  });

  it("limita títulos aos níveis 2 e 3", () => {
    const doc = sanitizeRichDoc({ type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "a" }] }] });
    expect(doc?.content[0].attrs).toEqual({ level: 2 });
  });

  it("converte texto simples em parágrafos", () => {
    expect(textToRichDoc("a\n\nb").content).toHaveLength(2);
  });
});

describe("vídeos incorporados", () => {
  it("aceita YouTube e Vimeo", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=10")?.id).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ")?.provider).toBe("youtube");
    expect(parseVideoUrl("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });

  it("recusa outros provedores e links malformados", () => {
    expect(parseVideoUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
    expect(parseVideoUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
  });
});

describe("jornada de integração", () => {
  const steps: StepInput[] = [
    { id: "w", order: 1, type: "WELCOME", required: true },
    { id: "h", order: 2, type: "HISTORY", required: true },
    { id: "opt", order: 3, type: "CUSTOM", required: false },
    { id: "c", order: 4, type: "COURSE", required: false },
    { id: "o", order: 5, type: "ORGCHART", required: true },
    { id: "end", order: 6, type: "CONCLUSION", required: true },
  ];

  it("libera as etapas obrigatórias em ordem", () => {
    const r = computeOnboarding(steps, new Set());
    expect(r.states.get("w")).toBe("available");
    expect(r.states.get("h")).toBe("locked");
    expect(r.states.get("opt")).toBe("available"); // opcional nunca bloqueia
    expect(r.states.get("o")).toBe("locked");
    expect(r.nextStepId).toBe("w");
    expect(r.completed).toBe(false);
  });

  it("conclui automaticamente a etapa de conclusão quando as obrigatórias terminam", () => {
    const r = computeOnboarding(steps, new Set(["w", "h", "o"]));
    expect(r.states.get("end")).toBe("done");
    expect(r.completed).toBe(true);
    expect(r.percent).toBe(67); // 4 de 6 (opcionais não feitas)
  });

  it("não permite conclusão manual de curso, avaliação ou conclusão", () => {
    const r = computeOnboarding(steps, new Set(["w", "h"]));
    expect(canCompleteManually(steps[3], r.states.get("c"))).toBe(false);
    expect(canCompleteManually(steps[5], r.states.get("end"))).toBe(false);
    expect(canCompleteManually(steps[4], r.states.get("o"))).toBe(true);
    expect(canCompleteManually(steps[1], "locked")).toBe(false);
  });

  it("etapas sugeridas seguem o modelo híbrido (7 etapas)", () => {
    const rows = defaultStepRows();
    expect(rows.map((r) => r.type)).toEqual(["WELCOME", "HISTORY", "VALUES", "ORGCHART", "COURSE", "ASSESSMENT", "CONCLUSION"]);
    expect(rows.filter((r) => !r.required).map((r) => r.type)).toEqual(["COURSE", "ASSESSMENT"]);
  });
});

describe("árvore do organograma", () => {
  const nodes = [
    { id: "a", parentId: null, order: 1 },
    { id: "b", parentId: "a", order: 2 },
    { id: "c", parentId: "a", order: 1 },
    { id: "d", parentId: "b", order: 1 },
    { id: "orfao", parentId: "inexistente", order: 1 },
  ];

  it("monta a árvore ordenada e trata órfãos como raízes", () => {
    const tree = buildTree(nodes);
    expect(tree.map((n) => n.id)).toEqual(["a", "orfao"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["c", "b"]);
    expect(tree[0].children[1].children[0].id).toBe("d");
  });

  it("detecta ciclos ao mover posições", () => {
    expect(wouldCreateCycle(nodes, "a", "d")).toBe(true);
    expect(wouldCreateCycle(nodes, "b", "b")).toBe(true);
    expect(wouldCreateCycle(nodes, "d", "c")).toBe(false);
    expect(wouldCreateCycle(nodes, "b", null)).toBe(false);
  });

  it("lista descendentes", () => {
    expect([...descendantIds(nodes, "a")].sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("validação de imagens", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);
  it("identifica pelo conteúdo", () => {
    expect(detectImageType(png)?.mime).toBe("image/png");
    expect(detectImageType(jpg)?.mime).toBe("image/jpeg");
  });
  it("recusa arquivos que não são imagens, mesmo com extensão de imagem", () => {
    const fakePng = new TextEncoder().encode("<svg onload=alert(1)>");
    expect(validateImage(fakePng).ok).toBe(false);
    expect(validateImage(new Uint8Array()).ok).toBe(false);
  });
  it("recusa imagens acima de 5 MB", () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(png);
    expect(validateImage(big).ok).toBe(false);
  });
  it("limpa nomes de arquivo", () => {
    expect(safeFileName("../../etc/passwd")).toBe("....etcpasswd");
    expect(safeFileName("Foto Fundação.jpg")).toBe("Foto Fundacao.jpg");
  });
});
