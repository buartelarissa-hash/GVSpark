import * as React from "react";
import { cn } from "@/lib/utils";
import { safeHref, type RichNode } from "@/lib/rich-text";

/** Renderiza um documento TipTap saneado como React (sem HTML bruto). */
export function RichTextView({ doc, className }: { doc: unknown; className?: string }) {
  if (!doc || typeof doc !== "object" || !Array.isArray((doc as RichNode).content)) return null;
  return (
    <div className={cn("space-y-3 text-[0.95rem] leading-relaxed text-ink/90", className)}>
      {(doc as RichNode).content!.map((n, i) => (
        <Node key={i} node={n} />
      ))}
    </div>
  );
}

function Children({ node }: { node: RichNode }) {
  return <>{node.content?.map((c, i) => <Node key={i} node={c} />)}</>;
}

function Node({ node }: { node: RichNode }): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return node.content ? <p><Children node={node} /></p> : <p aria-hidden="true">&nbsp;</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h4 className="pt-2 text-base font-semibold text-navy-900"><Children node={node} /></h4>
      ) : (
        <h3 className="pt-3 text-lg font-bold text-navy-900"><Children node={node} /></h3>
      );
    case "bulletList":
      return <ul className="list-disc space-y-1 pl-6 marker:text-spark-600"><Children node={node} /></ul>;
    case "orderedList":
      return (
        <ol className="list-decimal space-y-1 pl-6 marker:font-semibold marker:text-navy-600" start={Number(node.attrs?.start) || undefined}>
          <Children node={node} />
        </ol>
      );
    case "listItem":
      return <li className="[&>p]:inline"><Children node={node} /></li>;
    case "blockquote":
      return <blockquote className="border-l-4 border-spark-500 bg-spark-50 py-2 pl-4 pr-3 italic text-navy-800"><Children node={node} /></blockquote>;
    case "horizontalRule":
      return <hr className="my-4 border-border" />;
    case "hardBreak":
      return <br />;
    case "text":
      return <Text node={node} />;
    default:
      return null;
  }
}

function Text({ node }: { node: RichNode }) {
  let el: React.ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") el = <strong className="font-semibold text-ink">{el}</strong>;
    else if (mark.type === "italic") el = <em>{el}</em>;
    else if (mark.type === "underline") el = <u>{el}</u>;
    else if (mark.type === "strike") el = <s>{el}</s>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href)
        el = (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-navy-700 underline underline-offset-2 hover:text-navy-900">
            {el}
          </a>
        );
    }
  }
  return <>{el}</>;
}
