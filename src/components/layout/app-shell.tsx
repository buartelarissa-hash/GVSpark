"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ArrowLeftRight, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { GigavaleLogo, Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import { ADMIN_NAV, COLABORADOR_NAV, filterNav, type NavGroup } from "./nav-config";

export type ShellUser = {
  name: string;
  username: string;
  avatarUrl: string | null;
  roleLabel: string;
  subtitle: string;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu principal" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi}>
          {group.label && (
            <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-wider text-navy-100/50">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-white/10 text-white" : "text-navy-100/80 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-spark-500 transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                    <item.icon className={cn("size-[1.1rem] shrink-0", active ? "text-spark-500" : "text-navy-100/60 group-hover:text-navy-100")} />
                    <span className="truncate">{item.label}</span>
                    {item.phase && (
                      <span className="ml-auto flex shrink-0 items-center" title="Em breve">
                        <span className="size-1.5 rounded-full bg-spark-500/70" aria-hidden="true" />
                        <span className="sr-only">(em breve)</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  portal,
  user,
  permissions,
  children,
}: {
  portal: "colaborador" | "adm";
  user: ShellUser;
  permissions: string[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const groups = filterNav(portal === "adm" ? ADMIN_NAV : COLABORADOR_NAV, permissions);
  const canAdmin = permissions.includes("admin.access");
  const homeHref = portal === "adm" ? "/adm" : "/inicio";

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href={homeHref} onClick={onNavigate} aria-label="GV SPARK — página inicial">
          <Logo />
        </Link>
        {portal === "adm" && (
          <span className="rounded bg-spark-500 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-navy-900">ADM</span>
        )}
      </div>
      <SidebarNav groups={groups} onNavigate={onNavigate} />
      <div className="space-y-1 border-t border-white/10 p-4 text-[0.7rem] text-navy-100/50">
        {groups.some((g) => g.items.some((i) => i.phase)) && (
          <p className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-spark-500/70" aria-hidden="true" /> Em breve
          </p>
        )}
        <div className="mt-2 flex justify-center rounded-lg bg-white px-3 py-2">
          <GigavaleLogo className="w-24" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar()}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy-950/60 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl animate-fade-in">
            {sidebar(() => setMobileOpen(false))}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-white/70 hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-ink hover:bg-navy-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Logo variant="dark" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {canAdmin && (
              <Link
                href={portal === "adm" ? "/inicio" : "/adm"}
                className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50 sm:inline-flex"
              >
                <ArrowLeftRight className="size-3.5" />
                {portal === "adm" ? "Portal do Colaborador" : "Portal ADM"}
              </Link>
            )}
            <Dropdown.Root>
              <Dropdown.Trigger className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-navy-50" aria-label="Menu do usuário">
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-40 truncate text-sm font-semibold leading-tight text-ink">{user.name}</span>
                  <span className="block max-w-40 truncate text-xs leading-tight text-muted">{user.subtitle}</span>
                </span>
                <ChevronDown className="size-4 text-muted" />
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-64 rounded-xl border border-border bg-white p-1.5 shadow-lg animate-fade-in"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted">Usuário: {user.username}</p>
                    <p className="mt-1 text-xs font-medium text-navy-600">{user.roleLabel}</p>
                  </div>
                  <Dropdown.Separator className="my-1 h-px bg-border" />
                  <Dropdown.Item asChild>
                    <Link href="/perfil" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-navy-50">
                      <UserRound className="size-4 text-muted" /> Meu perfil
                    </Link>
                  </Dropdown.Item>
                  {canAdmin && (
                    <Dropdown.Item asChild>
                      <Link
                        href={portal === "adm" ? "/inicio" : "/adm"}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-navy-50"
                      >
                        <ArrowLeftRight className="size-4 text-muted" />
                        {portal === "adm" ? "Ir para o Portal do Colaborador" : "Ir para o Portal ADM"}
                      </Link>
                    </Dropdown.Item>
                  )}
                  <Dropdown.Separator className="my-1 h-px bg-border" />
                  <form action={logoutAction}>
                    <Dropdown.Item asChild>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger-bg"
                      >
                        <LogOut className="size-4" /> Sair
                      </button>
                    </Dropdown.Item>
                  </form>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
