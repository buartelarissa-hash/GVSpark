import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpenCheck, Rocket, Trophy } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/permissions/permissions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const highlights = [
  { icon: Rocket, title: "Integração guiada", text: "Conheça a história, a cultura e as pessoas da Gigavale." },
  { icon: BookOpenCheck, title: "GV Spark Academy", text: "Treinamentos técnicos e de marcas parceiras." },
  { icon: Trophy, title: "Sua jornada", text: "Acompanhe certificados, metas e conquistas." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/alterar-senha" : homePathFor(user.role));
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-navy-700/60 blur-0"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full border-[3rem] border-spark-500/10" aria-hidden="true" />
        <Logo showTagline className="relative" />
        <div className="relative mt-auto max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-spark-500">Gigavale Atacado</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">
            Desperte seu potencial.
          </h1>
          <p className="mt-4 text-navy-100/80">
            A plataforma de integração, aprendizagem e desenvolvimento dos colaboradores da Gigavale.
          </p>
          <ul className="mt-10 space-y-5">
            {highlights.map((h) => (
              <li key={h.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-spark-500">
                  <h.icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{h.title}</span>
                  <span className="block text-sm text-navy-100/70">{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo variant="dark" showTagline />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Acesse sua conta</h2>
          <p className="mt-1 mb-8 text-sm text-muted">Entre com o usuário e a senha fornecidos pela empresa.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </div>
  );
}
