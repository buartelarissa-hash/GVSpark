/**
 * Documentos de texto formatado (formato JSON do TipTap).
 *
 * O conteúdo é sempre SANEADO no servidor antes de ser salvo: só os nós e marcas
 * abaixo são aceitos, links só com http(s)/mailto. A exibição usa um renderizador
 * próprio em React (sem HTML bruto), então não há como injetar scripts.
 */

export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type RichDoc = { type: "doc"; content: RichNode[] };

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
  "text",
]);
const MARKS = new Set(["bold", "italic", "underline", "strike", "link"]);
const MAX_DEPTH = 12;
const MAX_NODES = 5000;

export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const v = href.trim();
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return v.slice(0, 2000);
  return null;
}

/** Retorna um documento saneado, ou null se vazio/inválido. */
export function sanitizeRichDoc(input: unknown): RichDoc | null {
  let count = 0;
  function walk(node: unknown, depth: number): RichNode | null {
    if (!node || typeof node !== "object" || depth > MAX_DEPTH || ++count > MAX_NODES) return null;
    const n = node as RichNode;
    if (!BLOCKS.has(n.type)) return null;
    if (n.type === "text") {
      if (typeof n.text !== "string" || n.text.length === 0) return null;
      const marks = (Array.isArray(n.marks) ? n.marks : [])
        .filter((m) => m && MARKS.has(m.type))
        .map((m) => {
          if (m.type !== "link") return { type: m.type };
          const href = safeHref(m.attrs?.href);
          return href ? { type: "link", attrs: { href } } : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
      return { type: "text", text: n.text.slice(0, 20000), ...(marks.length ? { marks } : {}) };
    }
    const out: RichNode = { type: n.type };
    if (n.type === "heading") {
      const level = Number(n.attrs?.level);
      out.attrs = { level: level === 2 || level === 3 ? level : 2 };
    }
    if (n.type === "orderedList") {
      const start = Number(n.attrs?.start);
      if (Number.isInteger(start) && start > 1 && start < 10000) out.attrs = { start };
    }
    if (Array.isArray(n.content)) {
      const children = n.content.map((c) => walk(c, depth + 1)).filter((c): c is RichNode => c !== null);
      if (children.length) out.content = children;
    }
    return out;
  }

  if (!input || typeof input !== "object" || (input as RichNode).type !== "doc") return null;
  const content = ((input as RichNode).content ?? [])
    .map((c) => walk(c, 1))
    .filter((c): c is RichNode => c !== null);
  const doc: RichDoc = { type: "doc", content };
  const hasContent = richDocToText(doc).trim() !== "" || content.some((c) => c.type === "horizontalRule");
  return hasContent ? doc : null;
}

/** Converte JSON recebido de formulário em documento saneado. */
export function parseRichDoc(raw: string | null | undefined): RichDoc | null {
  if (!raw) return null;
  try {
    return sanitizeRichDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function richDocToText(doc: unknown): string {
  const parts: string[] = [];
  function walk(n: RichNode) {
    if (n.type === "text" && n.text) parts.push(n.text);
    if (n.type === "hardBreak") parts.push("\n");
    n.content?.forEach(walk);
    if (["paragraph", "heading", "listItem", "blockquote"].includes(n.type)) parts.push("\n");
  }
  if (doc && typeof doc === "object") ((doc as RichDoc).content ?? []).forEach(walk);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/** Documento simples a partir de texto (um parágrafo por linha em branco). */
export function textToRichDoc(text: string): RichDoc {
  return {
    type: "doc",
    content: text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}
