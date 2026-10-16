import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-navy-900">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-muted">O endereço acessado não existe ou não está disponível para você.</p>
      <Button asChild variant="navy" className="mt-6">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
