"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-navy-900">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Não foi possível concluir a operação. Tente novamente; se o problema continuar, avise o administrador do GV SPARK.
      </p>
      <Button variant="navy" className="mt-6" onClick={reset}>
        <RotateCcw /> Tentar novamente
      </Button>
    </div>
  );
}
