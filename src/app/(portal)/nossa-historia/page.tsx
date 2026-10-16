import type { CompanySection } from "@prisma/client";
import { Compass, Eye, Gem, HeartHandshake, Landmark, Target } from "lucide-react";
import { requireUser } from "@/server/auth/current-user";
import { listTimeline, publishedSections } from "@/server/services/company";
import { Card, CardContent } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GigavaleLogo } from "@/components/brand/logo";
import { RichTextView } from "@/components/content/rich-text-view";
import { VideoEmbed } from "@/components/content/video-embed";
import { cn } from "@/lib/utils";
import { Timeline } from "./timeline";

export const metadata = { title: "Nossa história" };

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} className="mb-6 scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-600">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900">{title}</h2>
    </div>
  );
}

function StorySection({ s, reverse }: { s: CompanySection; reverse?: boolean }) {
  return (
    <article className={cn("grid items-start gap-6", s.mediaUrl && "lg:grid-cols-2", reverse && "lg:[&>*:first-child]:order-2")}>
      <div>
        <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold text-navy-900">
          {s.title} {s.isDemo && <DemoBadge />}
        </h3>
        <RichTextView doc={s.body} className="mt-3" />
      </div>
      {s.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.mediaUrl} alt={s.title} loading="lazy" className="w-full rounded-xl object-cover shadow-[var(--shadow-card)]" />
      )}
    </article>
  );
}

const PILLARS = [
  { type: "MISSION", icon: Target },
  { type: "VISION", icon: Eye },
  { type: "PURPOSE", icon: Compass },
] as const;

export default async function OurStoryPage() {
  await requireUser();
  const [sections, events] = await Promise.all([publishedSections(), listTimeline(true)]);
  const of = (t: CompanySection["type"]) => sections.filter((s) => s.type === t);
  const history = of("HISTORY");
  const founders = of("FOUNDERS");
  const pillars = PILLARS.flatMap((p) => of(p.type).map((s) => ({ ...p, s })));
  const values = of("VALUES");
  const videos = of("VIDEO");
  const culture = of("CULTURE");

  const anchors = [
    history.length && { id: "historia", label: "História" },
    founders.length && { id: "fundadores", label: "Fundadores" },
    events.length && { id: "linha-do-tempo", label: "Linha do tempo" },
    (pillars.length || values.length) && { id: "valores", label: "Missão, visão e valores" },
    videos.length && { id: "video", label: "Vídeo" },
    culture.length && { id: "cultura", label: "Cultura" },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-10 text-white sm:px-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-navy-700/70" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-spark-500">Nossa história</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Conheça a Gigavale Atacado</h1>
            <p className="mt-3 text-navy-100/85">A trajetória, as pessoas e os valores que constroem a nossa empresa todos os dias.</p>
          </div>
          <div className="shrink-0 rounded-xl bg-white px-5 py-4">
            <GigavaleLogo className="w-40" />
          </div>
        </div>
        {anchors.length > 1 && (
          <nav aria-label="Nesta página" className="relative mt-8 flex flex-wrap gap-2">
            {anchors.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20">
                {a.label}
              </a>
            ))}
          </nav>
        )}
      </section>

      {anchors.length === 0 && (
        <Card>
          <EmptyState
            icon={Landmark}
            title="O conteúdo oficial ainda está sendo preparado"
            description="Em breve você encontrará aqui a história, os valores e a cultura da Gigavale."
          />
        </Card>
      )}

      {history.length > 0 && (
        <section>
          <SectionTitle id="historia" eyebrow="De onde viemos" title="Nossa história" />
          <div className="space-y-10">
            {history.map((s, i) => (
              <StorySection key={s.id} s={s} reverse={i % 2 === 1} />
            ))}
          </div>
        </section>
      )}

      {founders.length > 0 && (
        <section>
          <SectionTitle id="fundadores" eyebrow="Quem começou tudo" title="Fundadores" />
          <div className="grid gap-6 md:grid-cols-2">
            {founders.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-col gap-5 p-6 sm:flex-row">
                  {s.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.mediaUrl} alt={s.title} loading="lazy" className="size-28 shrink-0 rounded-xl object-cover" />
                  )}
                  <div>
                    <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy-900">
                      {s.title} {s.isDemo && <DemoBadge />}
                    </h3>
                    <RichTextView doc={s.body} className="mt-2 text-sm" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionTitle id="linha-do-tempo" eyebrow="Marcos importantes" title="Linha do tempo" />
          <Timeline
            entries={events.map((e) => ({
              id: e.id,
              year: e.date.getUTCFullYear(),
              dateLabel: monthYear.format(e.date).replace(".", ""),
              title: e.title,
              description: e.description,
              imageUrl: e.imageUrl,
              highlight: e.highlight,
              isDemo: e.isDemo,
            }))}
          />
        </section>
      )}

      {(pillars.length > 0 || values.length > 0) && (
        <section>
          <SectionTitle id="valores" eyebrow="O que nos guia" title="Missão, visão e valores" />
          {pillars.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {pillars.map(({ s, icon: Icon }) => (
                <div key={s.id} className="rounded-xl bg-navy-900 p-6 text-white">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-spark-500 text-navy-900">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold">
                    {s.title} {s.isDemo && <DemoBadge />}
                  </h3>
                  <RichTextView doc={s.body} className="mt-2 text-sm text-navy-100/90 [&_*]:text-navy-100/90 [&_strong]:text-white" />
                </div>
              ))}
            </div>
          )}
          {values.map((s) => (
            <Card key={s.id} className="mt-4">
              <CardContent className="p-6">
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-navy-900">
                  <Gem className="size-5 text-spark-600" aria-hidden="true" /> {s.title} {s.isDemo && <DemoBadge />}
                </h3>
                <RichTextView doc={s.body} className="mt-3" />
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <SectionTitle id="video" eyebrow="Assista" title="Vídeo institucional" />
          <div className="space-y-8">
            {videos.map((s) => (
              <div key={s.id} className="space-y-3">
                <VideoEmbed url={s.mediaUrl} title={s.title} />
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-navy-900">{s.title}</h3>
                  {s.isDemo && <DemoBadge />}
                </div>
                <RichTextView doc={s.body} className="text-sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {culture.length > 0 && (
        <section>
          <SectionTitle id="cultura" eyebrow="Como trabalhamos" title="Cultura organizacional" />
          <div className="space-y-10">
            {culture.map((s, i) => (
              <div key={s.id} className="flex gap-4">
                <HeartHandshake className="mt-1 hidden size-6 shrink-0 text-spark-600 sm:block" aria-hidden="true" />
                <div className="flex-1">
                  <StorySection s={s} reverse={i % 2 === 1} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
