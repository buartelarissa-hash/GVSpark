import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { GigavaleLogo, Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/permissions/permissions";
import { firstName } from "@/lib/utils";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Definir nova senha" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect(homePathFor(user.role));
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-8 flex items-center gap-5">
        <Logo variant="dark" showTagline />
        <span className="h-10 w-px bg-border" aria-hidden="true" />
        <GigavaleLogo className="w-28" />
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-full bg-spark-100 text-navy-900">
            <KeyRound className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-navy-900">Olá, {firstName(user.name)}! Defina sua senha</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Por segurança, troque a senha temporária recebida antes de continuar.
          </p>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
