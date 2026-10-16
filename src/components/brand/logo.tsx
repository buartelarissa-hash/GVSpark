import { cn } from "@/lib/utils";

/**
 * Logotipo tipográfico PROVISÓRIO do GV SPARK.
 * Para usar a logo oficial, substitua este componente (ou aponte para um arquivo
 * em /public/brand) — todos os pontos da aplicação usam <Logo />.
 */
export function SparkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-spark-500" />
      <path d="M18.2 4.5 8.6 18h6.1l-1.9 9.5L23.4 13h-6.2l1-8.5Z" className="fill-navy-900" />
    </svg>
  );
}

export function Logo({
  variant = "light",
  showTagline = false,
  className,
}: {
  variant?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}) {
  const text = variant === "light" ? "text-white" : "text-navy-900";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SparkMark />
      <div className="leading-none">
        <div className={cn("text-[1.05rem] font-extrabold tracking-tight", text)}>
          GV <span className="text-spark-500">SPARK</span>
        </div>
        {showTagline && (
          <div className={cn("mt-1 text-[0.7rem] font-medium tracking-wide", variant === "light" ? "text-navy-100/80" : "text-muted")}>
            Desperte seu potencial.
          </div>
        )}
      </div>
    </div>
  );
}
