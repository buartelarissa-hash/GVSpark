import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { shellProps } from "@/components/layout/shell-props";
import { requireUser } from "@/server/auth/current-user";
import { hasPermission } from "@/server/permissions/permissions";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!hasPermission(user.role, "portal.access")) redirect("/acesso-negado");
  return (
    <AppShell portal="colaborador" {...shellProps(user)}>
      {children}
    </AppShell>
  );
}
