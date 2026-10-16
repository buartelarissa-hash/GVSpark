import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { homePathFor } from "@/server/permissions/permissions";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/login");
}
