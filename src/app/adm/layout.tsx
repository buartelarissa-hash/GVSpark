import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { shellProps } from "@/components/layout/shell-props";
import { requirePagePermission } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Portal ADM", template: "%s · GV SPARK ADM" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePagePermission("admin.access");
  return (
    <AppShell portal="adm" {...shellProps(user)}>
      {children}
    </AppShell>
  );
}
