import { Download, ExternalLink, FileText, ListChecks, Presentation } from "lucide-react";
import type { LessonBlockType } from "@prisma/client";
import { RichTextView } from "@/components/content/rich-text-view";
import { VideoEmbed } from "@/components/content/video-embed";
import { fileUrl } from "@/lib/file-url";
import { formatBytes } from "@/lib/file-validation";
import { safeHref } from "@/lib/rich-text";

export type BlockFile = { id: string; originalName: string; mimeType: string; sizeBytes: number } | null;
export type BlockData = { id: string; type: LessonBlockType; content: unknown; file: BlockFile };

type C = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

function DownloadCard({ file, title, description, icon: Icon = FileText }: { file: NonNullable<BlockFile>; title?: string; description?: string; icon?: typeof FileText }) {
  return (
    <a
      href={`${fileUrl(file.id)}?download=1`}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-spark-500"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{title ?? file.originalName}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
        <span className="block text-xs text-muted">
          {file.originalName} · {formatBytes(file.sizeBytes)}
        </span>
      </span>
      <Download className="size-5 shrink-0 text-navy-600" aria-hidden="true" />
      <span className="sr-only">Baixar</span>
    </a>
  );
}

function PdfFrame({ file, title }: { file: NonNullable<BlockFile>; title: string }) {
  return (
    <div className="space-y-2">
      <iframe src={fileUrl(file.id)} title={title} className="h-[70dvh] w-full rounded-xl border border-border bg-white" />
      <a href={`${fileUrl(file.id)}?download=1`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
        <Download className="size-4" aria-hidden="true" /> Baixar {file.originalName}
      </a>
    </div>
  );
}

/** Exibe um bloco de aula (somente leitura). */
export function BlockView({ block }: { block: BlockData }) {
  const c = (block.content ?? {}) as C;
  const f = block.file;
  const heading = (t: string | undefined) => t && <h3 className="mb-3 text-lg font-semibold text-navy-900">{t}</h3>;
  switch (block.type) {
    case "RICH_TEXT":
      return <RichTextView doc={c.doc} />;
    case "IMAGE":
      return f ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(f.id)} alt={str(c.alt) ?? str(c.caption) ?? ""} loading="lazy" className="w-full rounded-xl border border-border" />
          {str(c.caption) && <figcaption className="mt-2 text-center text-sm text-muted">{str(c.caption)}</figcaption>}
        </figure>
      ) : null;
    case "VIDEO_UPLOAD":
      return f ? (
        <div>
          {heading(str(c.title))}
          <video controls preload="metadata" className="aspect-video w-full rounded-xl bg-navy-950" controlsList="nodownload">
            <source src={fileUrl(f.id)} type={f.mimeType} />
            Seu navegador não reproduz este vídeo.
          </video>
        </div>
      ) : null;
    case "VIDEO_EMBED":
      return (
        <div>
          {heading(str(c.title))}
          <VideoEmbed url={str(c.url)} title={str(c.title) ?? "Vídeo da aula"} />
        </div>
      );
    case "PDF":
      return f ? (
        <div>
          {heading(str(c.title))}
          <PdfFrame file={f} title={str(c.title) ?? f.originalName} />
        </div>
      ) : null;
    case "PRESENTATION":
      return f ? (
        <div>
          {heading(str(c.title))}
          {f.mimeType === "application/pdf" ? (
            <PdfFrame file={f} title={str(c.title) ?? f.originalName} />
          ) : (
            <DownloadCard file={f} title={str(c.title) ?? "Apresentação"} description="Baixe para abrir no PowerPoint." icon={Presentation} />
          )}
        </div>
      ) : null;
    case "LINK": {
      const href = safeHref(c.url);
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-spark-500">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
            <ExternalLink className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{str(c.title)}</span>
            {str(c.description) && <span className="block text-sm text-muted">{str(c.description)}</span>}
            <span className="block truncate text-xs text-navy-600">{href}</span>
          </span>
        </a>
      ) : null;
    }
    case "ACTIVITY":
      return (
        <div className="rounded-xl border-2 border-spark-500 bg-spark-50 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy-700">
            <ListChecks className="size-4" aria-hidden="true" /> Atividade
          </p>
          <h3 className="mt-1 text-lg font-semibold text-navy-900">{str(c.title)}</h3>
          <RichTextView doc={c.instructions} className="mt-2" />
        </div>
      );
    case "ATTACHMENT":
      return f ? <DownloadCard file={f} title={str(c.title)} description={str(c.description)} /> : null;
    default:
      return null;
  }
}
