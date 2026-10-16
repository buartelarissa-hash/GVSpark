import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Acesso negado" };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-bg text-danger">
        <ShieldX className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-navy-900">Acesso não autorizado</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Seu perfil não tem permissão para acessar esta área. Se acredita que isso é um engano, fale com o administrador do GV SPARK.
      </p>
      <Button asChild variant="navy" className="mt-6">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
