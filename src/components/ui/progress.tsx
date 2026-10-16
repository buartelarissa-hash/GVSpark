import { cn } from "@/lib/utils";

export function Progress({ value, className, label }: { value: number; className?: string; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-navy-100", className)}
    >
      <div className="h-full rounded-full bg-spark-500 transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}
