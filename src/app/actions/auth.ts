"use server";

import { redirect } from "next/navigation";
import { destroyCurrentSession } from "@/server/auth/session";
import { getCurrentUser } from "@/server/auth/current-user";
import { audit } from "@/server/services/audit";

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroyCurrentSession();
  if (user) await audit({ actorId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
  redirect("/login");
}
