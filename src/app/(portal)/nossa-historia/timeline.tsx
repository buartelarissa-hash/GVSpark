"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/ui/badge";

export type TimelineEntry = {
  id: string;
  year: number;
  dateLabel: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  highlight: boolean;
  isDemo: boolean;
};

/** Linha do tempo vertical com navegação rápida por ano. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const years = [...new Set(entries.map((e) => e.year))];
  const [active, setActive] = React.useState<number | null>(null);
  const [zoom, setZoom] = React.useState<TimelineEntry | null>(null);

  const goTo = (year: number) => {
    setActive(year);
    document.getElementById(`ano-${year}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      {years.length > 1 && (
        <nav aria-label="Anos" className="mb-8 flex gap-2 overflow-x-auto pb-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => goTo(y)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums transition-colors",
                active === y ? "border-navy-900 bg-navy-900 text-white" : "border-border bg-white text-navy-700 hover:border-spark-500",
              )}
            >
              {y}
            </button>
          ))}
        </nav>
      )}

      <ol className="relative space-y-8 before:absolute before:inset-y-0 before:left-[0.95rem] before:w-0.5 before:bg-navy-100 md:before:left-1/2 md:before:-translate-x-1/2">
        {entries.map((e, i) => {
          const firstOfYear = entries.findIndex((x) => x.year === e.year) === i;
          const right = i % 2 === 1;
          return (
            <li key={e.id} id={firstOfYear ? `ano-${e.year}` : undefined} className="relative scroll-mt-24 pl-12 md:grid md:grid-cols-2 md:gap-12 md:pl-0">
              <span
                className={cn(
                  "absolute left-2 top-5 flex size-4 items-center justify-center rounded-full ring-4 ring-surface md:left-1/2 md:-translate-x-1/2",
                  e.highlight ? "bg-spark-500" : "bg-navy-700",
                )}
                aria-hidden="true"
              />
              <div className={cn(right ? "md:col-start-2" : "md:col-start-1 md:text-right")}>
                <article
                  className={cn(
                    "inline-block w-full rounded-xl border bg-white p-5 text-left shadow-[var(--shadow-card)]",
                    e.highlight ? "border-spark-500" : "border-border",
                    active === e.year && "ring-2 ring-spark-500/60",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-navy-600">{e.dateLabel}</span>
                    {e.highlight && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-spark-100 px-2 py-0.5 text-xs font-semibold text-navy-900">
                        <Star className="size-3" aria-hidden="true" /> Marco
                      </span>
                    )}
                    {e.isDemo && <DemoBadge />}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-navy-900">{e.title}</h3>
                  {e.description && <p className="mt-2 whitespace-pre-line text-sm text-muted">{e.description}</p>}
                  {e.imageUrl && (
                    <button type="button" onClick={() => setZoom(e)} className="mt-3 block w-full overflow-hidden rounded-lg" aria-label={`Ampliar foto: ${e.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.imageUrl} alt={e.title} loading="lazy" className="aspect-video w-full object-cover transition-transform hover:scale-[1.02]" />
                    </button>
                  )}
                </article>
              </div>
            </li>
          );
        })}
      </ol>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoom.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4 animate-fade-in"
          onClick={() => setZoom(null)}
          onKeyDown={(ev) => ev.key === "Escape" && setZoom(null)}
          tabIndex={-1}
        >
          <figure className="max-h-full max-w-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.imageUrl!} alt={zoom.title} className="max-h-[80dvh] rounded-lg object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white">
              {zoom.dateLabel} · {zoom.title}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
