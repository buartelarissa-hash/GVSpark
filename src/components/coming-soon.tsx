import type { LucideIcon } from "lucide-react";
import { Hammer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Página de funcionalidade planejada para uma próxima fase do roadmap.
 * Deixa explícito ao usuário que a área ainda não está disponível.
 */
export function ComingSoon({
  title,
  description,
  phase,
  icon: Icon = Hammer,
  features,
}: {
  title: string;
  description: string;
  phase: number;
  icon?: LucideIcon;
  features: string[];
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-spark-100 text-navy-900">
            <Icon className="size-7" aria-hidden="true" />
          </span>
          <div>
            <Badge tone="spark">Em desenvolvimento · Fase {phase}</Badge>
            <h2 className="mt-3 text-lg font-semibold text-navy-900">Esta área está sendo preparada</h2>
            <p className="mt-1 text-sm text-muted">Quando estiver disponível, você encontrará aqui:</p>
            <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-spark-500" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
