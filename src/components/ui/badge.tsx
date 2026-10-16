import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-navy-50 text-navy-700",
      navy: "bg-navy-900 text-white",
      spark: "bg-spark-100 text-navy-900",
      success: "bg-success-bg text-success",
      danger: "bg-danger-bg text-danger",
      warning: "bg-warning-bg text-warning",
      info: "bg-info-bg text-info",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Marca visual para dados demonstrativos criados pelo seed. */
export function DemoBadge() {
  return (
    <Badge tone="warning" title="Registro demonstrativo do ambiente de desenvolvimento">
      Demonstrativo
    </Badge>
  );
}
