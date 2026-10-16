import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const btn = "inline-flex size-8 items-center justify-center rounded-md border border-border bg-white text-ink hover:bg-navy-50";
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm text-muted">
      <span>
        {total} {total === 1 ? "registro" : "registros"} · página {page} de {pageCount}
      </span>
      <div className="flex gap-1">
        <Link href={hrefFor(page - 1)} aria-label="Página anterior" className={cn(btn, page <= 1 && disabled)} aria-disabled={page <= 1}>
          <ChevronLeft className="size-4" />
        </Link>
        <Link href={hrefFor(page + 1)} aria-label="Próxima página" className={cn(btn, page >= pageCount && disabled)} aria-disabled={page >= pageCount}>
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
