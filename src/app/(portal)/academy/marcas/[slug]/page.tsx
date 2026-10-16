import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Download, ExternalLink, FileText, Link2, Youtube } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { brandForUser } from "@/server/services/learning";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RichTextView } from "@/components/content/rich-text-view";
import { VideoEmbed } from "@/components/content/video-embed";
import { fileUrl } from "@/lib/file-url";
import { formatBytes } from "@/lib/file-validation";
import { safeHref } from "@/lib/rich-text";
import { COURSE_LEVEL } from "@/lib/academy-labels";

export const metadata = { title: "Marca parceira" };

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const data = await brandForUser(user, slug);
  if (!data) notFound();
  const { brand, courses, categories } = data;
  const files = brand.materials.filter((m) => m.kind !== "VIDEO");
  const videos = brand.materials.filter((m) => m.kind === "VIDEO");
  const website = safeHref(brand.website);

  return (
    <div className="space-y-8">
      <Link href="/academy/marcas" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" /> Marcas parceiras
      </Link>
      <section className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:p-8">
        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-surface sm:w-56">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={`Logo ${brand.name}`} className="max-h-20 max-w-[85%] object-contain" />
          ) : (
            <span className="text-3xl font-extrabold text-navy-900">{brand.name}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-600">Marca parceira</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight text-navy-900">
            {brand.name} {brand.isDemo && <DemoBadge />}
          </h1>
          {brand.summary && <p className="mt-2 text-muted">{brand.summary}</p>}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:underline">
              Site oficial <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {(brand.presentation || brand.productLines.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {brand.presentation ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-3 text-lg font-bold text-navy-900">Apresentação</h2>
                <RichTextView doc={brand.presentation} />
              </CardContent>
            </Card>
          ) : <div />}
          {(brand.productLines.length > 0 || categories.length > 0) && (
            <Card className="h-fit">
              <CardContent className="p-6">
                <h2 className="mb-3 text-lg font-bold text-navy-900">Categorias de produtos</h2>
                <ul className="flex flex-wrap gap-2">
                  {[...new Set([...brand.productLines, ...categories])].map((p) => (
                    <li key={p}><Badge>{p}</Badge></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">Treinamentos disponíveis</h2>
        {courses.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <li key={c.id}>
                <Link href={`/academy/cursos/${c.slug}`} className="block h-full rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-card)] hover:border-spark-500">
                  <p className="text-xs font-semibold uppercase text-navy-600">{c.category?.name ?? "Treinamento"}</p>
                  <p className="mt-1 font-semibold">{c.title}</p>
                  <p className="mt-1 text-xs text-muted">{COURSE_LEVEL[c.level]}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card><EmptyState icon={FileText} title="Nenhum treinamento publicado desta marca ainda" className="py-8" /></Card>
        )}
      </section>

      {files.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-navy-900">Materiais técnicos</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {files.map((m) => {
              const href = m.kind === "FILE" && m.file ? `${fileUrl(m.file.id)}?download=1` : safeHref(m.url);
              if (!href) return null;
              return (
                <li key={m.id}>
                  <a href={href} {...(m.kind === "LINK" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 hover:border-spark-500">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                      {m.kind === "FILE" ? <FileText className="size-5" aria-hidden="true" /> : <Link2 className="size-5" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.title}</span>
                      <span className="block truncate text-xs text-muted">{m.file ? `${m.file.originalName} · ${formatBytes(m.file.sizeBytes)}` : m.url}</span>
                    </span>
                    {m.kind === "FILE" ? <Download className="size-4 text-navy-600" aria-hidden="true" /> : <ExternalLink className="size-4 text-navy-600" aria-hidden="true" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy-900"><Youtube className="size-5" aria-hidden="true" /> Vídeos</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {videos.map((v) => (
              <div key={v.id}>
                <VideoEmbed url={v.url} title={v.title} />
                <p className="mt-2 text-sm font-semibold">{v.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy-900"><ClipboardCheck className="size-5" aria-hidden="true" /> Avaliações relacionadas</h2>
        <p className="text-sm text-muted">As avaliações dos treinamentos desta marca chegam com a Fase 4.</p>
      </section>
    </div>
  );
}
