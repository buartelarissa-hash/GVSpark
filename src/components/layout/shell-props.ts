import "server-only";
import type { CurrentUser } from "@/server/auth/current-user";
import { ROLE_PERMISSIONS } from "@/server/permissions/permissions";
import { ROLE_LABELS } from "@/lib/roles";
import type { ShellUser } from "./app-shell";

export function shellProps(user: CurrentUser): { user: ShellUser; permissions: string[] } {
  return {
    user: {
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      roleLabel: ROLE_LABELS[user.role],
      subtitle: user.position?.title ?? ROLE_LABELS[user.role],
    },
    permissions: [...ROLE_PERMISSIONS[user.role]],
  };
}
